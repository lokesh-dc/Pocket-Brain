import * as Haptics from "expo-haptics";
import { Brain } from "lucide-react-native";
import React, { useState } from "react";
import {
	ActivityIndicator,
	Alert,
	FlatList,
	SafeAreaView,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from "react-native";
import EntryCard from "../../components/EntryCard";
import EntryPopup from "../../components/EntryPopup";
import InputBar from "../../components/InputBar";
import RetrievalResult from "../../components/RetrievalResult";
import { useEntries } from "../../hooks/useEntries";
import { classifyEntry } from "../../lib/classifier";
import { generateEmbedding } from "../../lib/embeddings";
import { supabase } from "../../lib/supabase";
import { Entry } from "../../types";

export default function IndexScreen() {
	const [isLoading, setIsLoading] = useState(false);
	const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
	const [searchResults, setSearchResults] = useState<Entry[]>([]);
	const [searchQuery, setSearchQuery] = useState("");
	const {
		entries,
		loading: entriesLoading,
		refresh,
		addEntry,
		updateEntry,
		removeEntry,
	} = useEntries();

	const handleCapture = async (text: string, manualCategory?: string) => {
		// Generate a temporary ID for the optimistic update
		const tempId = `temp-${Date.now()}`;
		const now = new Date().toISOString();

		// 1. OPTIMISTIC UPDATE: Add the entry to the UI immediately
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

		// We don't block the UI with "isLoading" anymore
		// setIsLoading(true);

		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				Alert.alert("Error", "You must be logged in to save entries.");
				removeEntry(tempId);
				return;
			}

			// Start classification in parallel with other background tasks
			// (This is still "background" because we don't await the whole flow)
			const processEntry = async () => {
				try {
					const [classified, embedding] = await Promise.all([
						classifyEntry(text),
						generateEmbedding(text),
					]);

					const categoryName = manualCategory || classified.category;

					// Resolve category
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

					// Save the real entry
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

					// Update the UI with real data
					updateEntry(tempId, {
						id: entry.id,
						user_id: user.id,
						summary: classified.summary,
						category: categoryData || undefined,
						amount: classified.amount,
						currency: classified.currency,
					});

					// Handle entities in the background
					if (classified.entity) {
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
							// Refresh full entry to get joined entities if needed
							// or just update locally
						}
					}

					await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
				} catch (err) {
					console.error("Background processing error:", err);
					// Optional: revert optimistic update on hard failure
					// removeEntry(tempId);
				}
			};

			processEntry(); // Execute everything in the background
		} catch (error: any) {
			console.error("Error starting entry capture:", error);
			Alert.alert("Error", error.message || "Failed to start capture");
			removeEntry(tempId);
		}
	};

	const handleSearch = async (text: string) => {
		setIsLoading(true);
		setSearchQuery(text);
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) return;

			const embedding = await generateEmbedding(text);

			const { data, error } = await supabase.rpc("match_entries", {
				query_embedding: embedding,
				match_threshold: 0.5,
				match_count: 5,
				p_user_id: user.id,
			});

			if (error) throw error;

			const entryIds = (data as any[]).map((r) => r.id);
			const { data: fullEntries } = await supabase
				.from("entries")
				.select("*, category:categories(*), entities:entities(*)")
				.in("id", entryIds);

			setSearchResults(fullEntries || []);
		} catch (error: any) {
			console.error("Search error:", error);
			Alert.alert("Search Error", error.message);
		} finally {
			setIsLoading(false);
		}
	};

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
				data={entries}
				keyExtractor={(item) => item.id}
				renderItem={({ item }) => (
					<EntryCard entry={item} onPress={() => setSelectedEntry(item)} />
				)}
				contentContainerStyle={styles.listContent}
				ListEmptyComponent={
					entriesLoading ? (
						<ActivityIndicator style={{ marginTop: 40 }} />
					) : (
						renderEmptyState
					)
				}
				showsVerticalScrollIndicator={false}
			/>

			<InputBar
				onSubmit={handleCapture}
				onSearch={handleSearch}
				isLoading={isLoading}
			/>

			<EntryPopup
				entry={selectedEntry}
				onClose={() => setSelectedEntry(null)}
			/>

			<RetrievalResult
				results={searchResults}
				query={searchQuery}
				onClose={() => setSearchResults([])}
				onEntryPress={(entry) => {
					setSearchResults([]);
					setSelectedEntry(entry);
				}}
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
		paddingTop: 40,
		flexGrow: 1,
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
});
