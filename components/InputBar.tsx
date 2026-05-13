import { ArrowUp, LayoutGrid } from "lucide-react-native";
import React, { useState } from "react";
import {
	KeyboardAvoidingView,
	Platform,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import CategoryPopup, { Category } from "./CategoryPopup";
import EntityChip from "./EntityChip";

interface InputBarProps {
	onSubmit: (text: string, category?: string) => void;
	isLoading?: boolean;
}

export default function InputBar({ onSubmit, isLoading }: InputBarProps) {
	const [text, setText] = useState("");
	const [isPopupVisible, setIsPopupVisible] = useState(false);
	const [selectedCategory, setSelectedCategory] = useState<Category | null>(
		null,
	);

	const showEntityChip = text.toLowerCase().includes("spent");

	const handleSubmit = () => {
		if (text.trim()) {
			onSubmit(text, selectedCategory?.name);
			setText("");
			setSelectedCategory(null);
		}
	};

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === "ios" ? "padding" : "height"}
			keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
			<View style={styles.outerContainer}>
				{showEntityChip && (
					<EntityChip
						label="Food"
						onPress={() => console.log("EntityChip pressed")}
					/>
				)}

				<View style={styles.container}>
					<TouchableOpacity
						style={styles.iconButton}
						onPress={() => setIsPopupVisible(true)}>
						<LayoutGrid
							size={22}
							color={selectedCategory ? selectedCategory.color : "#64748b"}
						/>
					</TouchableOpacity>

					<TextInput
						style={styles.input}
						placeholder="What's on your mind?"
						placeholderTextColor="#94a3b8"
						value={text}
						onChangeText={setText}
						multiline
						numberOfLines={1}
						maxHeight={100}
					/>

					<TouchableOpacity
						style={[
							styles.sendButton,
							!text.trim() && styles.disabledButton,
							isLoading && styles.loadingButton,
						]}
						onPress={handleSubmit}
						disabled={!text.trim() || isLoading}>
						<ArrowUp size={20} color={text.trim() ? "#fff" : "#94a3b8"} />
					</TouchableOpacity>
				</View>
			</View>

			<CategoryPopup
				visible={isPopupVisible}
				onClose={() => setIsPopupVisible(false)}
				onSelect={(cat) => setSelectedCategory(cat)}
				selectedId={selectedCategory?.id}
			/>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	outerContainer: {
		backgroundColor: "#fff",
		borderTopWidth: 1,
		borderTopColor: "#f1f5f9",
		paddingVertical: 12,
	},
	container: {
		flexDirection: "row",
		alignItems: "flex-end",
		paddingHorizontal: 16,
	},
	iconButton: {
		padding: 10,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 2,
	},
	input: {
		flex: 1,
		fontSize: 16,
		color: "#0f172a",
		paddingTop: 10,
		paddingBottom: 10,
		paddingHorizontal: 12,
		minHeight: 40,
	},
	sendButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: "#0f172a",
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 4,
		marginLeft: 8,
	},
	disabledButton: {
		backgroundColor: "#f1f5f9",
	},
	loadingButton: {
		opacity: 0.7,
	},
});
