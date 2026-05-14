import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
	Easing,
	FadeIn,
	FadeOut,
	interpolateColor,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { SLIDES } from "../../constants/onboarding";

const { width, height } = Dimensions.get("window");

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function OnboardingScreen() {
	const router = useRouter();
	const [currentIndex, setCurrentIndex] = useState(0);
	const slide = SLIDES[currentIndex];

	const buttonScale = useSharedValue(1);
	const transitionValue = useSharedValue(0); // 0 to 1 for slide transitions

	// Color interpolation for button
	const buttonStyle = useAnimatedStyle(() => {
		const backgroundColor = interpolateColor(
			transitionValue.value,
			SLIDES.map((_, i) => i),
			SLIDES.map((s) => s.accent),
		);
		return {
			backgroundColor,
			transform: [{ scale: buttonScale.value }],
		};
	});

	useEffect(() => {
		transitionValue.value = withTiming(currentIndex, { duration: 400 });
	}, [currentIndex]);

	const handleNext = async () => {
		if (currentIndex < SLIDES.length - 1) {
			setCurrentIndex((prev) => prev + 1);
		} else {
			await AsyncStorage.setItem("onboarding_complete", "true");
			router.replace("/(auth)/login");
		}
	};

	const handleSignIn = async () => {
		await AsyncStorage.setItem("onboarding_complete", "true");
		router.replace("/(auth)/login");
	};

	const onPressIn = () => {
		buttonScale.value = withSpring(0.97);
	};

	const onPressOut = () => {
		buttonScale.value = withSpring(1);
	};

	return (
		<SafeAreaView style={styles.container}>
			<AnimatedCircle accent={slide.accent} key={`circle-${currentIndex}`} />

			<View style={styles.header}>
				<Text style={styles.logo}>Mindrop</Text>
			</View>

			<View style={styles.content}>
				<Animated.View
					key={`content-${currentIndex}`}
					entering={FadeIn.duration(400).easing(Easing.out(Easing.cubic))}
					exiting={FadeOut.duration(400).easing(Easing.out(Easing.cubic))}
					style={styles.slideContent}>
					<Animated.Text
						entering={FadeIn.delay(100)}
						style={[styles.eyebrow, { color: slide.accent }]}>
						{slide.eyebrow}
					</Animated.Text>

					<View style={styles.headlineContainer}>
						{slide.headline.split("\n").map((line, lineIndex) => (
							<View key={`line-${lineIndex}`} style={styles.headlineRow}>
								{line.split(" ").map((word, wordIndex) => {
									const delay = (lineIndex * 3 + wordIndex) * 60;
									return (
										<Animated.Text
											key={`word-${lineIndex}-${wordIndex}`}
											entering={FadeIn.delay(delay)
												.duration(400)
												.easing(Easing.out(Easing.cubic))}
											style={styles.headlineWord}>
											{word}{" "}
										</Animated.Text>
									);
								})}
							</View>
						))}
					</View>

					<Animated.Text entering={FadeIn.delay(300)} style={styles.sub}>
						{slide.sub}
					</Animated.Text>
				</Animated.View>
			</View>

			{/* Footer */}
			<View style={styles.footer}>
				<View style={styles.pagination}>
					{SLIDES.map((_, i) => (
						<Dot
							key={i}
							index={i}
							currentIndex={currentIndex}
							accent={SLIDES[i].accent}
						/>
					))}
				</View>

				<AnimatedPressable
					style={[styles.button, buttonStyle]}
					onPress={handleNext}
					onPressIn={onPressIn}
					onPressOut={onPressOut}>
					<Text style={styles.buttonText}>
						{currentIndex === SLIDES.length - 1 ? "Get Started" : "Continue"}
					</Text>
				</AnimatedPressable>

				{currentIndex === SLIDES.length - 1 && (
					<Animated.View entering={FadeIn.delay(200)}>
						<Pressable onPress={handleSignIn} style={styles.signInLink}>
							<Text style={styles.signInText}>
								Already have an account? Sign In
							</Text>
						</Pressable>
					</Animated.View>
				)}
			</View>
		</SafeAreaView>
	);
}

// Background Accent Circle Component
function AnimatedCircle({ accent }: { accent: string }) {
	const scale = useSharedValue(0.8);
	const opacity = useSharedValue(0);

	useEffect(() => {
		scale.value = withTiming(1, {
			duration: 500,
			easing: Easing.out(Easing.cubic),
		});
		opacity.value = withTiming(0.06, { duration: 500 });
	}, []);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
		backgroundColor: accent,
	}));

	return <Animated.View style={[styles.circle, animatedStyle]} />;
}

// Pagination Dot Component
function Dot({
	index,
	currentIndex,
	accent,
}: {
	index: number;
	currentIndex: number;
	accent: string;
}) {
	const isActive = index === currentIndex;
	const width = useSharedValue(isActive ? 20 : 6);
	const bgColor = useSharedValue(isActive ? accent : "#e5e5e5");

	useEffect(() => {
		width.value = withSpring(isActive ? 20 : 6, { damping: 12 });
		bgColor.value = withTiming(isActive ? accent : "#e5e5e5", {
			duration: 300,
		});
	}, [isActive, accent]);

	const animatedStyle = useAnimatedStyle(() => ({
		width: width.value,
		backgroundColor: bgColor.value,
	}));

	return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#faf9f7",
	},
	circle: {
		position: "absolute",
		bottom: -height * 0.1,
		right: -width * 0.2,
		width: width * 1.5,
		height: width * 1.5,
		borderRadius: width * 0.75,
	},
	header: {
		paddingHorizontal: 24,
		paddingTop: 20,
	},
	logo: {
		fontFamily: "DMSerifDisplay-Italic",
		fontSize: 20,
		color: "#1a1a1a",
	},
	content: {
		flex: 1,
		justifyContent: "center",
		paddingHorizontal: 24,
	},
	slideContent: {
		justifyContent: "center",
	},
	eyebrow: {
		fontSize: 11,
		letterSpacing: 1.5,
		fontWeight: "700",
		marginBottom: 16,
	},
	headlineContainer: {
		marginBottom: 20,
	},
	headlineRow: {
		flexDirection: "row",
		flexWrap: "wrap",
	},
	headlineWord: {
		fontFamily: "DMSerifDisplay-Regular",
		fontSize: 48,
		lineHeight: 52,
		color: "#1a1a1a",
	},
	sub: {
		fontFamily: "DMSans-Regular",
		fontSize: 15,
		color: "#555",
		maxWidth: 280,
		lineHeight: 24,
	},
	footer: {
		paddingHorizontal: 24,
		paddingBottom: 40,
		minHeight: 140,
	},
	pagination: {
		flexDirection: "row",
		justifyContent: "center",
		marginBottom: 24,
	},
	dot: {
		height: 6,
		borderRadius: 3,
		marginHorizontal: 4,
	},
	button: {
		width: "100%",
		height: 56,
		borderRadius: 100,
		justifyContent: "center",
		alignItems: "center",
	},
	buttonText: {
		fontFamily: "DMSans-Medium",
		fontSize: 16,
		color: "#fff",
	},
	signInLink: {
		marginTop: 16,
		alignItems: "center",
		paddingVertical: 8,
	},
	signInText: {
		fontFamily: "DMSans-Regular",
		fontSize: 13,
		color: "#888", // ink3
	},
});
