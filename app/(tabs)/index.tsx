import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
	Alert,
	SafeAreaView,
	FlatList,
	StatusBar,
	StyleSheet,
	Text,
	View,
  ActivityIndicator,
} from "react-native";
import { Brain } from "lucide-react-native";
import InputBar from "../../components/InputBar";
import EntryCard from "../../components/EntryCard";
import EntryPopup from "../../components/EntryPopup";
import { classifyEntry } from "../../lib/classifier";
import { supabase } from "../../lib/supabase";
import { useEntries } from "../../hooks/useEntries";
import { Entry } from "../../types";

export default function IndexScreen() {
	const [isLoading, setIsLoading] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null);
  const { entries, loading: entriesLoading } = useEntries();

	const handleCapture = async (text: string, manualCategory?: string) => {
		setIsLoading(true);
		try {
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				Alert.alert("Error", "You must be logged in to save entries.");
				return;
			}

			const classified = await classifyEntry(text);
			const categoryName = manualCategory || classified.category;

			let categoryId = null;
			const { data: catData } = await supabase
				.from("categories")
				.select("id")
				.eq("user_id", user.id)
				.ilike("name", categoryName)
				.single();

			if (catData) {
				categoryId = catData.id;
			} else {
				const { data: newCat } = await supabase
					.from("categories")
					.insert({
						user_id: user.id,
						name: categoryName,
					})
					.select()
					.single();

				if (newCat) categoryId = newCat.id;
			}

			const { data: entry, error: entryError } = await supabase
				.from("entries")
				.insert({
					user_id: user.id,
					raw_text: text,
					category_id: categoryId,
					summary: classified.summary,
					amount: classified.amount,
					currency: classified.currency,
				})
				.select()
				.single();

			if (entryError) throw entryError;

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

			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} catch (error: any) {
			console.error("Error saving entry:", error);
			Alert.alert("Error", error.message || "Failed to save entry");
		} finally {
			setIsLoading(false);
		}
	};

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Brain size={48} color="#e2e8f0" strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>your mind is quiet right now</Text>
      <Text style={styles.emptySubtitle}>drop a thought below to get started</Text>
    </View>
  );

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="dark-content" />
			
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <EntryCard 
            entry={item} 
            onPress={() => setSelectedEntry(item)} 
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={entriesLoading ? <ActivityIndicator style={{ marginTop: 40 }} /> : renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

			<InputBar onSubmit={handleCapture} isLoading={isLoading} />

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
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 100, // Offset to center relative to input bar
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#94a3b8',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    marginTop: 8,
  },
});
