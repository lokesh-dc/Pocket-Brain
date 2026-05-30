import * as Haptics from "expo-haptics";
import { LinearGradient } from 'expo-linear-gradient';
import { Brain } from "lucide-react-native";
import React from "react";
import {
	ActivityIndicator,
	Alert,
	DeviceEventEmitter,
	FlatList,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import EntryCard from "../../components/EntryCard";
import EntryPopup from "../../components/EntryPopup";
import RetrievalResult from "../../components/RetrievalResult";
import { useEntries } from "../../hooks/useEntries";
import { getRetrievalAnswer } from "../../lib/ai";
import { classifyEntry, detectIntent } from "../../lib/classifier";
import { generateEmbedding, searchEntries } from "../../lib/embeddings";
import { supabase } from "../../lib/supabase";
import { Entry } from "../../types";

export default function IndexScreen() {
	const [isLoading, setIsLoading] = React.useState(false);
	const [selectedEntry, setSelectedEntry] = React.useState<Entry | null>(null);
	const [aiResponse, setAiResponse] = React.useState<{
		answer: string;
		entry_ids: string[];
	} | null>(null);
	const [profile, setProfile] = React.useState<{ full_name: string | null } | null>(
		null,
	);
	const flatListRef = React.useRef<FlatList>(null);

	React.useEffect(() => {
		const fetchProfile = async () => {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;

			const { data } = await supabase
				.from("user_profiles")
				.select("full_name")
				.eq("id", user.id)
				.single();

			if (data) setProfile(data);
		};
		fetchProfile();

		// Listen for custom tab bar input
		const sub = DeviceEventEmitter.addListener('input_submit', ({ text, mode }) => {
			handleInputSubmit(text, mode === 'retrieve' ? 'retrieve' : undefined);
		});

		return () => sub.remove();
	}, []);

	const {
		entries,
		loading: entriesLoading,
		refresh,
		addEntry,
		updateEntry,
		removeEntry,
	} = useEntries();

	const handleInputSubmit = async (text: string, category?: string) => {
		const intent = detectIntent(text);
		console.log(`[Flow] Intent: ${intent} | Input: "${text}"`);
		if (intent === "retrieve") {
			await handleRetrieval(text);
		} else {
			await handleCapture(text, category);
		}
	};

	const handleCapture = async (text: string, manualCategory?: string) => {
		console.log('[Flow] Starting capture...');
		const tempId = `temp-${Date.now()}`;
		const now = new Date().toISOString();

		addEntry({
			id: tempId,
			user_id: "pending",
			raw_text: text,
			summary: "Categorising your thought...",
			timestamp: now,
			category: {
				id: "misc",
				name: manualCategory || "misc",
				icon: "HelpCircle",
				user_id: "system",
				is_default: true,
			},
		});

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				Alert.alert("Error", "You must be logged in to save entries.");
				removeEntry(tempId);
				return;
			}

			const processEntry = async () => {
				try {
					console.log('[Flow] Classifying...');
					const classifiedResults = await classifyEntry(text);
					console.log('[Flow] Classified:', JSON.stringify(classifiedResults));

					const savedEntries: string[] = [];

					for (const classified of classifiedResults) {
						try {
							const embedding = await generateEmbedding(classified.summary);

							const categoryName = manualCategory || classified.category;

							let categoryData = null;
							const { data: catData } = await supabase
								.from("categories")
								.select("*")
								.eq("user_id", user.id)
								.ilike("name", categoryName)
								.single();

							if (catData) {
								categoryData = catData;
							} else {
								const { data: newCat } = await supabase
									.from("categories")
									.insert({ user_id: user.id, name: categoryName })
									.select()
									.single();
								if (newCat) categoryData = newCat;
							}

							const { data: entry, error: entryError } = await supabase
								.from("entries")
								.insert({
									user_id: user.id,
									raw_text: text,
									category_id: categoryData?.id,
									summary: classified.summary,
									amount: classified.amount,
									currency: classified.currency,
									embedding: embedding,
								})
								.select()
								.single();

							if (entryError) throw entryError;

							// Only update temp entry for the first saved item
							if (savedEntries.length === 0) {
								updateEntry(tempId, {
									id: entry.id,
									user_id: user.id,
									summary: classified.summary,
									category: categoryData || undefined,
									amount: classified.amount,
									currency: classified.currency,
								});
							} else {
								// Subsequent entries: add new entry to local state
								addEntry({
									id: entry.id,
									user_id: user.id,
									raw_text: text,
									summary: classified.summary,
									timestamp: new Date().toISOString(),
									category: categoryData || undefined,
									amount: classified.amount,
									currency: classified.currency,
								});
							}

							if (classified.entity) {
								console.log('[Flow] Linking entity:', classified.entity);
								const { data: existingEntity } = await supabase
									.from("entities")
									.select("id")
									.eq("user_id", user.id)
									.eq("name", classified.entity)
									.eq("type", classified.entity_type || "project")
									.single();

								let entityId;
								if (existingEntity) {
									entityId = existingEntity.id;
								} else {
									const { data: newEntity } = await supabase
										.from("entities")
										.insert({
											user_id: user.id,
											name: classified.entity,
											type: classified.entity_type || "project",
										})
										.select()
										.single();
									if (newEntity) entityId = newEntity.id;
								}

								if (entityId && entry) {
									await supabase.from("entry_entities").insert({
										entry_id: entry.id,
										entity_id: entityId,
									});
								}
							}

							savedEntries.push(entry.id);
							console.log(`[Flow] Entry saved (${savedEntries.length}/${classifiedResults.length}):`, entry.id, classified.summary);
						} catch (err) {
							console.error(`[Flow] Failed to save "${classified.summary}":`, err);
						}
					}

					if (savedEntries.length > 0) {
						await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
					}
				} catch (err) {
					console.error("[Flow] Classification/embedding error:", err);
				}
			};

			processEntry();
		} catch (error: any) {
			console.error("Error starting entry capture:", error);
			Alert.alert("Error", error.message || "Failed to start capture");
			removeEntry(tempId);
		}
	};

	const handleRetrieval = async (text: string) => {
		console.log('[Flow] Starting retrieval...');
		setIsLoading(true);
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;

			const results = await searchEntries(text, user.id);
			console.log('[Flow] Matched entries:', results.length, results);
			const response = await getRetrievalAnswer(text, results);

			console.log('[Flow] AI response ready, type:', response.type);
			setAiResponse(response);
			await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
		} catch (error) {
			console.error("Retrieval error:", error);
			Alert.alert("Error", "I could not retrieve your memories right now.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleResponsePress = () => {
		if (aiResponse?.entry_ids?.length) {
			const firstId = aiResponse.entry_ids[0];
			const index = entries.findIndex((e) => e.id === firstId);
			if (index !== -1) {
				flatListRef.current?.scrollToIndex({ index, animated: true });
			}
		}
	};

	const renderHeader = () => (
		<View style={styles.header}>
			<Text style={styles.welcomeText}>
				Hello, {profile?.full_name?.split(" ")[0] || "there"}
			</Text>
		</View>
	);

	const renderEmptyState = () => (
		<View style={styles.emptyContainer}>
			<Brain size={48} color="#e2e8f0" strokeWidth={1.5} />
			<Text style={styles.emptyTitle}>your mind is quiet right now</Text>
			<Text style={styles.emptySubtitle}>
				drop a thought below to get started
			</Text>
		</View>
	);

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="dark-content" />

			<FlatList
				ref={flatListRef}
				data={entries}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<EntryCard entry={item} onPress={() => setSelectedEntry(item)} />
				)}
				contentContainerStyle={styles.listContent}
				ListHeaderComponent={renderHeader}
				ListEmptyComponent={
					entriesLoading ? (
						<ActivityIndicator style={{ marginTop: 40 }} />
					) : (
						renderEmptyState()
					)
				}
				showsVerticalScrollIndicator={false}
			/>

			{aiResponse && (
				<RetrievalResult
					answer={aiResponse.answer}
					entryCount={aiResponse.entry_ids.length}
					onClose={() => setAiResponse(null)}
					onPress={handleResponsePress}
				/>
			)}

			<LinearGradient
				colors={['rgba(250, 249, 247, 0)', 'rgba(250, 249, 247, 0.8)', '#faf9f7']}
				style={styles.bottomMask}
				pointerEvents="none"
			/>

			<EntryPopup
				entry={selectedEntry}
				onClose={() => setSelectedEntry(null)}
			/>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#faf9f7",
	},
	listContent: {
		padding: 20,
		paddingTop: 10,
		flexGrow: 1,
	},
	header: {
		marginBottom: 24,
		marginTop: 8,
	},
	welcomeText: {
		fontFamily: "DMSerifDisplay-Regular",
		fontSize: 28,
		color: "#1a1a1a",
	},
	emptyContainer: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 100, // Offset to center relative to input bar
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: "600",
		color: "#94a3b8",
		marginTop: 16,
	},
	emptySubtitle: {
		fontSize: 14,
		color: "#cbd5e1",
		marginTop: 8,
	},
	bottomMask: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: 120,
	},
});
