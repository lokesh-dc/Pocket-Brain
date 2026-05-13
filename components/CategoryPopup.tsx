import {
	Activity,
	Banknote,
	BookOpen,
	Lightbulb,
	Plane,
	Plus,
	ShoppingBag,
	X,
} from "lucide-react-native";
import React from "react";
import {
	Dimensions,
	Modal,
	StyleSheet,
	Text,
	TouchableOpacity,
	TouchableWithoutFeedback,
	View,
} from "react-native";

const { height } = Dimensions.get("window");

export interface Category {
	id: string;
	name: string;
	icon: any;
	color: string;
}

export const DEFAULT_CATEGORIES: Category[] = [
	{ id: "expense", name: "Expenses", icon: Banknote, color: "#f87171" },
	{ id: "reading", name: "Reading", icon: BookOpen, color: "#60a5fa" },
	{ id: "travel", name: "Travel", icon: Plane, color: "#34d399" },
	{ id: "idea", name: "Ideas", icon: Lightbulb, color: "#fbbf24" },
	{ id: "shopping", name: "Shopping", icon: ShoppingBag, color: "#a78bfa" },
	{ id: "health", name: "Health", icon: Activity, color: "#f472b6" },
	{ id: "new", name: "New Category", icon: Plus, color: "#94a3b8" },
];

interface CategoryPopupProps {
	visible: boolean;
	onClose: () => void;
	onSelect: (category: Category) => void;
	selectedId?: string;
}

export default function CategoryPopup({
	visible,
	onClose,
	onSelect,
	selectedId,
}: CategoryPopupProps) {
	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onClose}>
			<TouchableWithoutFeedback onPress={onClose}>
				<View style={styles.overlay}>
					<TouchableWithoutFeedback>
						<View style={styles.content}>
							<View style={styles.header}>
								<Text style={styles.title}>Select Category</Text>
								<TouchableOpacity onPress={onClose} style={styles.closeButton}>
									<X size={20} color="#64748b" />
								</TouchableOpacity>
							</View>

							<View style={styles.grid}>
								{DEFAULT_CATEGORIES.map((category) => {
									const Icon = category.icon;
									const isSelected = selectedId === category.id;

									return (
										<TouchableOpacity
											key={category.id}
											style={[styles.card, isSelected && styles.selectedCard]}
											onPress={() => {
												if (category.id === "new") {
													console.log("New Category tapped");
												} else {
													onSelect(category);
													onClose();
												}
											}}>
											<View
												style={[
													styles.iconContainer,
													{
														backgroundColor: isSelected
															? category.color
															: "#f1f5f9",
													},
												]}>
												<Icon
													size={24}
													color={isSelected ? "#fff" : category.color}
												/>
											</View>
											<Text
												style={[
													styles.categoryName,
													isSelected && styles.selectedCategoryName,
												]}>
												{category.name}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>
						</View>
					</TouchableWithoutFeedback>
				</View>
			</TouchableWithoutFeedback>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: "rgba(0,0,0,0.5)",
		justifyContent: "flex-end",
	},
	content: {
		backgroundColor: "#fff",
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		padding: 24,
		paddingBottom: 40,
		maxHeight: height * 0.7,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 24,
	},
	title: {
		fontSize: 18,
		fontWeight: "700",
		color: "#0f172a",
	},
	closeButton: {
		padding: 4,
	},
	grid: {
		flexDirection: "row",
		flexWrap: "wrap",
		justifyContent: "space-between",
	},
	card: {
		width: "30%",
		aspectRatio: 0.9,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 16,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: "#f1f5f9",
	},
	selectedCard: {
		borderColor: "#e2e8f0",
		backgroundColor: "#f8fafc",
	},
	iconContainer: {
		width: 48,
		height: 48,
		borderRadius: 14,
		justifyContent: "center",
		alignItems: "center",
		marginBottom: 8,
	},
	categoryName: {
		fontSize: 12,
		color: "#64748b",
		fontWeight: "500",
		textAlign: "center",
	},
	selectedCategoryName: {
		color: "#0f172a",
		fontWeight: "600",
	},
});
