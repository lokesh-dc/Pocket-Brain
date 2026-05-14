import * as Haptics from "expo-haptics";
import { Brain } from "lucide-react-native";
import React, { useState, useRef } from "react";
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
import { detectIntent, classifyEntry } from "../../lib/classifier";
import { generateEmbedding, searchEntries } from "../../lib/embeddings";
import { retrieveEntries } from "../../lib/ai";
import { supabase } from "../../lib/supabase";
import { Entry } from "../../types";

export default function IndexScreen() {
	const [isLoading, setIsLoading] = useState(false);
	const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const [aiResponse, setAiResponse] = useState<{ answer: string; entry_ids: string[] } | null>(null);
  const flatListRef = useRef<FlatList>(null);

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
    if (intent === 'retrieve') {
      await handleRetrieval(text);
    } else {
      await handleCapture(text, category);
    }
  };

	const handleCapture = async (text: string, manualCategory?: string) => {
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
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) {
				Alert.alert("Error", "You must be logged in to save entries.");
				removeEntry(tempId);
				return;
			}

			const processEntry = async () => {
				try {
					const [classified, embedding] = await Promise.all([
						classifyEntry(text),
						generateEmbedding(text),
					]);

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

					updateEntry(tempId, {
						id: entry.id,
						user_id: user.id,
						summary: classified.summary,
						category: categoryData || undefined,
						amount: classified.amount,
						currency: classified.currency,
					});

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
						}
					}

					await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
				} catch (err) {
					console.error("Background processing error:", err);
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
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const results = await searchEntries(text, user.id);
      const response = await retrieveEntries(text, results);
      
      setAiResponse(response);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Retrieval error:', error);
      Alert.alert('Error', 'I could not retrieve your memories right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResponsePress = () => {
    if (aiResponse?.entry_ids?.length) {
      const firstId = aiResponse.entry_ids[0];
      const index = entries.findIndex(e => e.id === firstId);
      if (index !== -1) {
        flatListRef.current?.scrollToIndex({ index, animated: true });
      }
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
        ref={flatListRef}
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

      {aiResponse && (
        <RetrievalResult
          answer={aiResponse.answer}
          entryCount={aiResponse.entry_ids.length}
          onClose={() => setAiResponse(null)}
          onPress={handleResponsePress}
        />
      )}

			<InputBar
				onSubmit={handleInputSubmit}
				isLoading={isLoading}
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
