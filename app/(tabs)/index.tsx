import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
	Alert,
	SafeAreaView,
	ScrollView,
	StatusBar,
	StyleSheet,
	Text,
	View,
} from "react-native";
import InputBar from "../../components/InputBar";
import { classifyEntry } from "../../lib/classifier";
import { supabase } from "../../lib/supabase";

export default function IndexScreen() {
	const [isLoading, setIsLoading] = useState(false);

	const handleCapture = async (text: string, manualCategory?: string) => {
		setIsLoading(true);
		try {
			// 1. Get current user
			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (!user) {
				Alert.alert("Error", "You must be logged in to save entries.");
				return;
			}

			// 2. Call classifier with raw text
			const classified = await classifyEntry(text);
			console.log("Classified Result:", classified);

			// 3. Resolve category (use manual if provided, else use classified)
			const categoryName = manualCategory || classified.category;

			// Get or create category
			let categoryId = null;
			const { data: catData, error: catError } = await supabase
				.from("categories")
				.select("id")
				.eq("user_id", user.id)
				.ilike("name", categoryName)
				.single();

			if (catData) {
				categoryId = catData.id;
			} else {
				// Create new category if not found
				const { data: newCat, error: newCatError } = await supabase
					.from("categories")
					.insert({
						user_id: user.id,
						name: categoryName,
					})
					.select()
					.single();

				if (newCat) categoryId = newCat.id;
			}

			// 4. Save to entries table
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

			// 5. Handle Entities
			if (classified.entity) {
				// Check if entity exists
				const { data: existingEntity } = await supabase
					.from("entities")
					.select("id")
					.eq("user_id", user.id)
					.eq("name", classified.entity)
					.eq("type", classified.entity_type || "project") // default type
					.single();

				let entityId;
				if (existingEntity) {
					entityId = existingEntity.id;
				} else {
					const { data: newEntity, error: entityCreateError } = await supabase
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

			// 6. Success Haptic
			await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		} catch (error: any) {
			console.error("Error saving entry:", error);
			Alert.alert("Error", error.message || "Failed to save entry");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<SafeAreaView style={styles.container}>
			<StatusBar barStyle="light-content" />
			<View style={styles.header}>
				<Text style={styles.greeting}>Good Evening,</Text>
				<Text style={styles.title}>What's on your mind?</Text>
			</View>

			<ScrollView contentContainerStyle={styles.scrollContent}>
				<View style={styles.emptyState}>
					<View style={styles.placeholderCard} />
					<View style={styles.placeholderCard} />
					<View style={styles.placeholderCard} />
					<Text style={styles.emptyText}>
						Your intelligent timeline will appear here.
					</Text>
				</View>
			</ScrollView>

			<InputBar onSubmit={handleCapture} isLoading={isLoading} />
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#0f172a",
	},
	header: {
		padding: 24,
		paddingTop: 12,
	},
	greeting: {
		fontSize: 16,
		color: "#94a3b8",
		fontWeight: "500",
	},
	title: {
		fontSize: 28,
		fontWeight: "700",
		color: "#f8fafc",
		marginTop: 4,
	},
	scrollContent: {
		flexGrow: 1,
		padding: 24,
	},
	emptyState: {
		flex: 1,
		justifyContent: "center",
		alignItems: "center",
	},
	placeholderCard: {
		width: "100%",
		height: 100,
		backgroundColor: "#1e293b",
		borderRadius: 20,
		marginBottom: 16,
		opacity: 0.5,
		borderWidth: 1,
		borderColor: "#334155",
		borderStyle: "dashed",
	},
	emptyText: {
		color: "#64748b",
		fontSize: 14,
		marginTop: 12,
		fontStyle: "italic",
		textAlign: "center",
	},
});
