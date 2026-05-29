import { format, formatDistanceToNow } from "date-fns";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { getCategoryConfig } from "../constants/Categories";
import { Entry } from "../types";

interface EntryCardProps {
	entry: Entry;
	onPress: () => void;
}

export default function EntryCard({ entry, onPress }: EntryCardProps) {
	const categoryName = entry.category?.name || "Misc";
	const config = getCategoryConfig(categoryName);
	const Icon = config.icon;

	const isExpense = categoryName.toLowerCase().includes("expense");

	const dateObj = new Date(entry.timestamp);
	const monthStr = format(dateObj, "MMM");
	const dayStr = format(dateObj, "dd");

	return (
		<View style={styles.container}>
			<View style={styles.dateCol}>
				<Text style={styles.dateMonth}>{monthStr}</Text>
				<Text style={styles.dateDay}>{dayStr}</Text>
			</View>
			<TouchableOpacity
				style={[styles.card, { borderLeftColor: config.accent }]}
				onPress={onPress}
				activeOpacity={0.7}>
				<View style={styles.header}>
					<View style={styles.categoryInfo}>
						<Icon size={16} color={config.accent} />
						<Text style={[styles.categoryName, { color: config.accent }]}>
							{categoryName}
						</Text>
					</View>

					{entry.entities && entry.entities.length > 0 && (
						<TouchableOpacity
							style={styles.entityTag}
							onPress={() =>
								console.log("Entity tapped:", entry.entities?.[0].name)
							}>
							<Text style={styles.entityText}>{entry.entities[0].name}</Text>
						</TouchableOpacity>
					)}
				</View>

				<Text style={styles.summary} numberOfLines={2}>
					{entry.summary || entry.raw_text}
				</Text>

				<View style={styles.footer}>
					{isExpense && entry.amount && (
						<View style={styles.amountBadge}>
							<Text style={styles.amountText}>
								{entry.currency === "INR" ? "₹" : entry.currency || ""}
								{entry.amount}
							</Text>
						</View>
					)}
					<View style={{ flex: 1 }} />
					<Text style={styles.time}>
						{formatDistanceToNow(new Date(entry.timestamp), {
							addSuffix: true,
						})}
					</Text>
				</View>
			</TouchableOpacity>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		marginBottom: 12,
	},
	dateCol: {
		width: 48,
		alignItems: "center",
		paddingTop: 12,
		marginRight: 8,
	},
	dateMonth: {
		fontSize: 12,
		fontWeight: "700",
		color: "#94a3b8",
		textTransform: "uppercase",
	},
	dateDay: {
		fontSize: 22,
		fontWeight: "800",
		color: "#1e293b",
		marginTop: 2,
	},
	card: {
		flex: 1,
		backgroundColor: "#fff",
		borderRadius: 16,
		padding: 16,
		borderLeftWidth: 4,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 8,
		elevation: 3,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 8,
	},
	categoryInfo: {
		flexDirection: "row",
		alignItems: "center",
	},
	categoryName: {
		fontSize: 12,
		fontWeight: "700",
		marginLeft: 6,
		textTransform: "uppercase",
		letterSpacing: 0.5,
	},
	entityTag: {
		backgroundColor: "#f1f5f9",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 6,
	},
	entityText: {
		fontSize: 10,
		color: "#64748b",
		fontWeight: "600",
	},
	summary: {
		fontSize: 16,
		color: "#1e293b",
		lineHeight: 22,
		fontWeight: "500",
		marginBottom: 12,
	},
	footer: {
		flexDirection: "row",
		alignItems: "center",
	},
	amountBadge: {
		backgroundColor: "#dcfce7",
		paddingHorizontal: 8,
		paddingVertical: 2,
		borderRadius: 12,
	},
	amountText: {
		fontSize: 12,
		color: "#166534",
		fontWeight: "700",
	},
	time: {
		fontSize: 11,
		color: "#94a3b8",
	},
});
