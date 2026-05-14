import AsyncStorage from "@react-native-async-storage/async-storage";
import { Session } from "@supabase/supabase-js";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, DeviceEventEmitter, View } from "react-native";
import { supabase } from "../lib/supabase";

export default function RootLayout() {
	const [session, setSession] = useState<Session | null>(null);
	const [initialized, setInitialized] = useState(false);
	const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(
		null,
	);
	const [setupComplete, setSetupComplete] = useState<boolean | null>(null);
	const segments = useSegments();
	const router = useRouter();

	useEffect(() => {
		const initialize = async () => {
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				setSession(session);

				if (session?.user) {
					try {
						const { data } = await supabase
							.from("user_profiles")
							.select("setup_complete")
							.eq("id", session.user.id)
							.single();
						setSetupComplete(data?.setup_complete ?? false);
					} catch (e) {
						setSetupComplete(false);
					}
				} else {
					setSetupComplete(null);
				}

				const onboardingStatus = await AsyncStorage.getItem(
					"onboarding_complete",
				);
				setOnboardingComplete(onboardingStatus === "true");
			} catch (e) {
				console.error(e);
			} finally {
				setInitialized(true);
			}
		};

		initialize();

		supabase.auth.onAuthStateChange(async (_event, session) => {
			setSession(session);
			if (session?.user) {
				try {
					const { data } = await supabase
						.from("user_profiles")
						.select("setup_complete")
						.eq("id", session.user.id)
						.single();
					setSetupComplete(data?.setup_complete ?? false);
				} catch (e) {
					setSetupComplete(false);
				}
			} else {
				setSetupComplete(null);
			}
		});

		const setupListener = DeviceEventEmitter.addListener(
			"setup_complete",
			() => {
				setSetupComplete(true);
			},
		);

		return () => {
			setupListener.remove();
		};
	}, []);

	useEffect(() => {
		// AsyncStorage.removeItem("onboarding_complete");
		if (!initialized || onboardingComplete === null) return;

		AsyncStorage.getItem("onboarding_complete").then((status) => {
			const isComplete = status === "true";
			if (isComplete !== onboardingComplete) {
				setOnboardingComplete(isComplete);
				return; // wait for next render
			}

			const inAuthGroup = segments[0] === "(auth)";
			const inOnboardingGroup =
				segments[0] === "(onboarding)" && segments[1] !== "setup";

			if (!isComplete && !inOnboardingGroup) {
				router.replace("/(onboarding)");
			} else if (isComplete && !session && !inAuthGroup) {
				router.replace("/(auth)/login");
			} else if (isComplete && session) {
				if (setupComplete === false && segments[1] !== "setup") {
					router.replace("/(onboarding)/setup");
				} else if (
					setupComplete === true &&
					(inAuthGroup || inOnboardingGroup)
				) {
					router.replace("/(tabs)");
				}
			}
		});
	}, [session, initialized, onboardingComplete, setupComplete, segments]);

	if (!initialized) {
		return (
			<View
				style={{
					flex: 1,
					justifyContent: "center",
					alignItems: "center",
					backgroundColor: "#0f172a",
				}}>
				<ActivityIndicator size="large" color="#6366f1" />
			</View>
		);
	}

	return (
		<Stack screenOptions={{ headerShown: false }}>
			<Stack.Screen name="(onboarding)" options={{ animation: "fade" }} />
			<Stack.Screen name="(auth)/login" options={{ animation: "fade" }} />
			<Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
		</Stack>
	);
}
