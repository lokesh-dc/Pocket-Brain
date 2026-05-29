import * as Haptics from "expo-haptics";
import {
	House,
	LayoutGrid,
	Plus,
	Search,
	Send,
	Sparkle,
	Sparkles,
	X,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
	DeviceEventEmitter,
	Dimensions,
	Platform,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import Animated, {
	Easing,
	Extrapolate,
	interpolate,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EntityChip from "./EntityChip";

const { width } = Dimensions.get("window");
const TAB_BAR_MARGINS = 32 + 52 + 12; // wrapper(32) + accent(52) + pill MR(12)
const PILL_WIDTH = width - TAB_BAR_MARGINS;
const INNER_PILL_WIDTH = PILL_WIDTH - 12; // paddingHorizontal: 6 * 2
const TAB_WIDTH = INNER_PILL_WIDTH / 3;

export default function CustomTabBar({ state, descriptors, navigation }: any) {
	const insets = useSafeAreaInsets();
	const [isInputActive, setIsInputActive] = useState(false);
	const [inputText, setInputText] = useState("");
	const [mode, setMode] = useState<"log" | "retrieve">("log");
	const inputRef = useRef<TextInput>(null);

	// Animation values
	const inputAnim = useSharedValue(0);
	const buttonScale = useSharedValue(1);
	const dropletAnim = useSharedValue(0);

	const activeIndex = state.index;
	const indicatorPosition = useSharedValue(activeIndex);

	useEffect(() => {
		indicatorPosition.value = withSpring(activeIndex, {
			damping: 20,
			stiffness: 180,
		});
	}, [activeIndex]);

	useEffect(() => {
		if (isInputActive) {
			inputAnim.value = withTiming(1, {
				duration: 380,
				easing: Easing.out(Easing.cubic),
			});
			dropletAnim.value = withSpring(1, { damping: 18, stiffness: 150 });
			setTimeout(() => inputRef.current?.focus(), 400);
		} else {
			inputAnim.value = withTiming(0, {
				duration: 300,
				easing: Easing.out(Easing.cubic),
			});
			dropletAnim.value = withTiming(0, { duration: 200 });
			inputRef.current?.blur();
		}
	}, [isInputActive]);

	const toggleInput = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
		if (isInputActive && inputText.trim()) {
			DeviceEventEmitter.emit("input_submit", { text: inputText, mode });
			setInputText("");
			setIsInputActive(false);
		} else if (!isInputActive) {
			setIsInputActive(true);
		}
	};

	const closeInput = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setIsInputActive(false);
		setInputText("");
	};

	const toggleMode = () => {
		Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		setMode((prev) => (prev === "log" ? "retrieve" : "log"));
	};

	// Animated Styles
	const pillStyle = useAnimatedStyle(() => ({
		opacity: interpolate(inputAnim.value, [0, 0.2], [1, 0], Extrapolate.CLAMP),
		transform: [{ scale: interpolate(inputAnim.value, [0, 1], [1, 0.95]) }],
		pointerEvents: inputAnim.value > 0.5 ? "none" : "auto",
	}));

	const inputBarStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: interpolate(inputAnim.value, [0, 1], [width, 0]) },
		],
		opacity: inputAnim.value,
	}));

	const accentButtonStyle = useAnimatedStyle(() => ({
		transform: [{ scale: buttonScale.value }],
	}));

	const dropletStyle = useAnimatedStyle(() => ({
		opacity: dropletAnim.value,
		transform: [
			{ scale: dropletAnim.value },
			{ translateY: interpolate(dropletAnim.value, [0, 1], [0, -68]) },
		],
	}));

	const onPressIn = () => {
		buttonScale.value = withSpring(0.94);
	};

	const onPressOut = () => {
		buttonScale.value = withSpring(1);
	};

	const indicatorStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: indicatorPosition.value * TAB_WIDTH }],
	}));

	const tabs = [
		{ name: "index", label: "Home", icon: House },
		{ name: "insights", label: "Insights", icon: Sparkles },
		{ name: "categories", label: "Categories", icon: LayoutGrid },
	];

	const showEntityChip =
		mode === "log" && inputText.toLowerCase().includes("spent");

	return (
		<View style={[styles.wrapper, { bottom: insets.bottom + 16 }]}>
			{/* Entity Chip Detection */}
			{isInputActive && showEntityChip && (
				<View style={styles.chipContainer}>
					<EntityChip label="Food" onPress={() => {}} />
				</View>
			)}

			{/* Droplet Close Button */}
			<Animated.View style={[styles.droplet, dropletStyle]}>
				<TouchableOpacity style={styles.dropletButton} onPress={closeInput}>
					<X size={20} color="#1a1a1a" />
				</TouchableOpacity>
			</Animated.View>

			<View style={styles.mainContainer}>
				{/* Tabs Pill */}
				<Animated.View style={[styles.pill, pillStyle]}>
					<View style={StyleSheet.absoluteFill}>
						<View style={{ flex: 1, marginHorizontal: 6, marginVertical: 6 }}>
							<Animated.View
								style={[
									{
										width: TAB_WIDTH,
										height: "100%",
										backgroundColor: "white",
										borderRadius: 20,
									},
									indicatorStyle,
								]}
							/>
						</View>
					</View>

					{tabs.map((tab, index) => {
						const isFocused = activeIndex === index;
						const Icon = tab.icon;

						const onPress = () => {
							Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
							navigation.navigate(tab.name);
						};

						return (
							<TouchableOpacity
								key={tab.name}
								onPress={onPress}
								style={[styles.tabItem, { flex: 1 }]}>
								<Icon
									size={20}
									color={isFocused ? "#1a1a1a" : "white"}
									strokeWidth={isFocused ? 2.5 : 2}
									opacity={isFocused ? 1 : 0.4}
								/>
							</TouchableOpacity>
						);
					})}
				</Animated.View>

				{/* Input Bar Layer */}
				<Animated.View style={[styles.inputBarContainer, inputBarStyle]}>
					<TouchableOpacity onPress={toggleMode} style={styles.modeToggle}>
						{mode === "log" ? (
							<Search size={20} color="#64748b" />
						) : (
							<Sparkle size={20} color="#7F77DD" />
						)}
					</TouchableOpacity>
					<TextInput
						ref={inputRef}
						style={styles.textInput}
						placeholder={
							mode === "log" ? "drop a thought..." : "ask anything..."
						}
						placeholderTextColor="#94a3b8"
						value={inputText}
						onChangeText={setInputText}
						multiline
						numberOfLines={1}
						maxHeight={100}
					/>
				</Animated.View>

				{/* Accent Action Button (+) */}
				<Animated.View style={[styles.accentCircle, accentButtonStyle]}>
					<TouchableOpacity
						style={styles.accentButton}
						onPress={toggleInput}
						onPressIn={onPressIn}
						onPressOut={onPressOut}>
						{isInputActive ? (
							mode === "retrieve" ? (
								<Search size={22} color="white" />
							) : (
								<Send size={22} color="white" />
							)
						) : (
							<Plus size={26} color="white" />
						)}
					</TouchableOpacity>
				</Animated.View>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	wrapper: {
		position: "absolute",
		left: 16,
		right: 16,
		zIndex: 1000,
	},
	mainContainer: {
		flexDirection: "row",
		alignItems: "center",
		width: "100%",
	},
	pill: {
		backgroundColor: "#1a1a1a",
		height: 52,
		borderRadius: 26,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 6,
		marginRight: 12,
		flex: 1,
		justifyContent: "space-between",
	},
	tabItem: {
		height: 40,
		justifyContent: "center",
		alignItems: "center",
		flexDirection: "row",
		paddingHorizontal: 12,
		borderRadius: 20,
	},
	accentCircle: {
		width: 52,
		height: 52,
		borderRadius: 26,
		backgroundColor: "#7F77DD",
		shadowColor: "#7F77DD",
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.4,
		shadowRadius: 16,
		elevation: 8,
	},
	accentButton: {
		width: "100%",
		height: "100%",
		justifyContent: "center",
		alignItems: "center",
	},
	inputBarContainer: {
		position: "absolute",
		left: 0,
		right: 64, // 52 + 12
		height: 52,
		backgroundColor: "white",
		borderRadius: 26,
		flexDirection: "row",
		alignItems: "center",
		paddingHorizontal: 8,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 10,
		elevation: 3,
	},
	modeToggle: {
		width: 44,
		height: 44,
		justifyContent: "center",
		alignItems: "center",
	},
	textInput: {
		flex: 1,
		fontSize: 16,
		color: "#1a1a1a",
		fontFamily: "DMSans-Regular",
		paddingRight: 12,
		paddingTop: Platform.OS === "ios" ? 0 : 4,
	},
	droplet: {
		position: "absolute",
		right: 6, // Center above accent button
		bottom: 0,
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: "white",
		justifyContent: "center",
		alignItems: "center",
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
		zIndex: -1,
	},
	dropletButton: {
		width: "100%",
		height: "100%",
		justifyContent: "center",
		alignItems: "center",
	},
	chipContainer: {
		position: "absolute",
		bottom: 64,
		left: 0,
	},
});
