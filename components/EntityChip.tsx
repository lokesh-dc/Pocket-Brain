import { ChevronDown } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

interface EntityChipProps {
	label: string;
	onPress: () => void;
}

export default function EntityChip({ label, onPress }: EntityChipProps) {
	return (
		<TouchableOpacity style={styles.container} onPress={onPress}>
			<Text style={styles.prefix}>logging into →</Text>
			<Text style={styles.label}>{label}</Text>
			<ChevronDown size={14} color="#64748b" style={styles.icon} />
		</TouchableOpacity>
	);
}

const styles = StyleSheet.create({
	container: {
		flexDirection: "row",
		alignItems: "center",
		backgroundColor: "#f1f5f9",
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		alignSelf: "flex-start",
		marginBottom: 8,
		marginLeft: 16,
		borderWidth: 1,
		borderColor: "#e2e8f0",
	},
	prefix: {
		fontSize: 12,
		color: "#64748b",
		marginRight: 4,
	},
	label: {
		fontSize: 12,
		fontWeight: "600",
		color: "#0f172a",
	},
	icon: {
		marginLeft: 4,
	},
});
