import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  DeviceEventEmitter,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  FadeInUp,
  Layout,
  SlideInRight,
  SlideOutLeft,
  ZoomIn,
  ZoomOut,
} from 'react-native-reanimated';
import { CheckCircle2, Hash, X } from 'lucide-react-native';
import { DEFAULT_CATEGORIES } from '../../components/CategoryPopup';
import { supabase } from '../../lib/supabase';

const STAGGER_DELAY = 150;

export default function SetupScreen() {
  const router = useRouter();
  
  // Step State
  const [step, setStep] = useState(1); // 1 = Name/Categories, 2 = Books, 3 = Projects

  // Name State
  const [fullName, setFullName] = useState('');

  // Category State
  const [customCategories, setCustomCategories] = useState<{ id: string; name: string }[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    DEFAULT_CATEGORIES.filter((c) => c.id !== 'new').map((c) => c.id)
  );

  // Book State
  const [books, setBooks] = useState<string[]>([]);
  const [currentBook, setCurrentBook] = useState('');

  // Project State (Step 3)
  const [projects, setProjects] = useState<string[]>([]);
  const [currentProject, setCurrentProject] = useState('');

  // --- Handlers ---

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (
      trimmed &&
      !customCategories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase()) &&
      !DEFAULT_CATEGORIES.find((c) => c.name.toLowerCase() === trimmed.toLowerCase())
    ) {
      const newId = `custom-${Date.now()}`;
      setCustomCategories((prev) => [...prev, { id: newId, name: trimmed }]);
      setSelectedCategories((prev) => [...prev, newId]);
      setNewCategoryName('');
    }
  };

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((c) => c !== id);
      }
      return [...prev, id];
    });
  };

  const handleAddBook = () => {
    const trimmed = currentBook.trim();
    if (trimmed && !books.includes(trimmed)) {
      setBooks((prev) => [...prev, trimmed]);
      setCurrentBook('');
    }
  };

  const handleRemoveBook = (book: string) => {
    setBooks((prev) => prev.filter((b) => b !== book));
  };

  const handleAddProject = () => {
    const trimmed = currentProject.trim();
    if (trimmed && !projects.includes(trimmed)) {
      setProjects((prev) => [...prev, trimmed]);
      setCurrentProject('');
    }
  };

  const handleRemoveProject = (project: string) => {
    setProjects((prev) => prev.filter((p) => p !== project));
  };

  // --- Navigation & Finalize ---

  const handleNextStep = () => {
    setStep(prev => prev + 1);
  };

  const handleFinish = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/(tabs)');
        return;
      }

      // 1. Update user_profiles
      const { error: profileError } = await supabase.from('user_profiles').upsert(
        {
          id: user.id,
          full_name: fullName.trim() || null,
          setup_complete: true,
          default_categories: selectedCategories,
        },
        { onConflict: 'id' }
      );
      if (profileError) console.error('Error saving profile:', profileError);

      // 2. Save books to entities
      if (books.length > 0) {
        const entitiesToInsert = books.map((book) => ({
          user_id: user.id,
          name: book,
          type: 'book',
        }));
        const { error: entitiesError } = await supabase.from('entities').insert(entitiesToInsert);
        if (entitiesError) console.error('Error saving books:', entitiesError);
      }

      // 3. Save projects to entities
      if (projects.length > 0) {
        const projectsToInsert = projects.map((proj) => ({
          user_id: user.id,
          name: proj,
          type: 'project',
        }));
        const { error: projError } = await supabase.from('entities').insert(projectsToInsert);
        if (projError) console.error('Error saving projects:', projError);
      }

      // 4. Save custom categories to categories table
      if (customCategories.length > 0) {
        const categoriesToInsert = customCategories.map((cat) => ({
          user_id: user.id,
          name: cat.name,
          is_default: true,
          icon: 'Hash',
        }));
        const { error: categoriesError } = await supabase
          .from('categories')
          .insert(categoriesToInsert);
        if (categoriesError) console.error('Error saving custom categories:', categoriesError);
      }

      DeviceEventEmitter.emit('setup_complete');
      router.replace('/(tabs)');
    } catch (e) {
      console.error(e);
      DeviceEventEmitter.emit('setup_complete');
      router.replace('/(tabs)');
    }
  };

  const handleSkipAll = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_profiles').upsert(
          {
            id: user.id,
            setup_complete: true,
          },
          { onConflict: 'id' }
        );
      }
    } catch (e) {
      console.error(e);
    } finally {
      DeviceEventEmitter.emit('setup_complete');
      router.replace('/(tabs)');
    }
  };

  // --- Render Steps ---

  const renderStep1 = () => (
    <Animated.View
      key="step1"
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(400)}
      style={styles.stepContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInUp.delay(0)}>
          <Text style={styles.title}>What Should We{'\n'}Call You?</Text>
          <Text style={styles.subtitle}>Step 1 of 3. Let's personalize your second brain.</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(STAGGER_DELAY)} style={styles.section}>
          <TextInput
            style={styles.input}
            placeholder="Your name..."
            placeholderTextColor="#94a3b8"
            value={fullName}
            onChangeText={setFullName}
            returnKeyType="next"
          />
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(STAGGER_DELAY * 1.5)} style={styles.section}>
          <Text style={styles.sectionLabel}>What Do You Mostly Want To Track?</Text>
          <View style={styles.grid}>
            {[
              ...DEFAULT_CATEGORIES.filter((c) => c.id !== 'new'),
              ...customCategories.map((c) => ({
                id: c.id,
                name: c.name,
                icon: Hash,
                color: '#6366f1',
              })),
            ].map((category) => {
              const Icon = category.icon;
              const isSelected = selectedCategories.includes(category.id);

              return (
                <TouchableOpacity
                  key={category.id}
                  style={[styles.card, isSelected && styles.selectedCard]}
                  onPress={() => toggleCategory(category.id)}
                >
                  {isSelected && (
                    <Animated.View entering={ZoomIn} exiting={ZoomOut} style={styles.checkIcon}>
                      <CheckCircle2 size={16} color={category.color} />
                    </Animated.View>
                  )}
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: isSelected ? category.color : '#f1f5f9' },
                    ]}
                  >
                    <Icon size={24} color={isSelected ? '#fff' : category.color} />
                  </View>
                  <Text style={[styles.categoryName, isSelected && styles.selectedCategoryName]}>
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TextInput
            style={[styles.input, { marginTop: 16 }]}
            placeholder="Add custom category..."
            placeholderTextColor="#94a3b8"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            onSubmitEditing={handleAddCategory}
            returnKeyType="done"
          />
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(STAGGER_DELAY * 2.5)} style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkipAll}>
          <Text style={styles.skipText}>Skip Setup</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View
      key="step2"
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(400)}
      style={styles.stepContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInUp.delay(0)}>
          <Text style={styles.title}>What Are You Reading{'\n'}Right Now?</Text>
          <Text style={styles.subtitle}>Step 2 of 3. We'll keep it handy for quick logging.</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(STAGGER_DELAY)} style={styles.section}>
          <TextInput
            style={styles.input}
            placeholder="Book name..."
            placeholderTextColor="#94a3b8"
            value={currentBook}
            onChangeText={setCurrentBook}
            onSubmitEditing={handleAddBook}
            returnKeyType="done"
          />

          <View style={styles.chipsContainer}>
            {books.map((book) => (
              <Animated.View
                key={book}
                entering={ZoomIn.springify()}
                exiting={ZoomOut}
                layout={Layout.springify()}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{book}</Text>
                <TouchableOpacity onPress={() => handleRemoveBook(book)} style={styles.chipRemove}>
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(STAGGER_DELAY * 2)} style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleNextStep}>
          <Text style={styles.primaryButtonText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkipAll}>
          <Text style={styles.skipText}>Skip Setup</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View
      key="step3"
      entering={SlideInRight.duration(400)}
      exiting={SlideOutLeft.duration(400)}
      style={styles.stepContainer}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInUp.delay(0)}>
          <Text style={styles.title}>Working On Any{'\n'}Projects?</Text>
          <Text style={styles.subtitle}>Final step. Drop in active projects to route ideas instantly.</Text>
        </Animated.View>

        <Animated.View entering={FadeInUp.delay(STAGGER_DELAY)} style={styles.section}>
          <TextInput
            style={styles.input}
            placeholder="Project name..."
            placeholderTextColor="#94a3b8"
            value={currentProject}
            onChangeText={setCurrentProject}
            onSubmitEditing={handleAddProject}
            returnKeyType="done"
          />

          <View style={styles.chipsContainer}>
            {projects.map((proj) => (
              <Animated.View
                key={proj}
                entering={ZoomIn.springify()}
                exiting={ZoomOut}
                layout={Layout.springify()}
                style={styles.chip}
              >
                <Text style={styles.chipText}>{proj}</Text>
                <TouchableOpacity onPress={() => handleRemoveProject(proj)} style={styles.chipRemove}>
                  <X size={14} color="#64748b" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(STAGGER_DELAY * 2)} style={styles.footer}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleFinish}>
          <Text style={styles.primaryButtonText}>Finish Setup</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkipAll}>
          <Text style={styles.skipText}>Skip Setup</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#faf9f7',
  },
  stepContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
    flexGrow: 1,
  },
  title: {
    fontFamily: 'DMSerifDisplay-Regular',
    fontSize: 36,
    lineHeight: 40,
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    color: '#888', // ink3
    marginBottom: 40,
  },
  section: {
    marginBottom: 40,
  },
  sectionLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  input: {
    fontFamily: 'DMSans-Regular',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  chipText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    color: '#0f172a',
    marginRight: 6,
  },
  chipRemove: {
    padding: 2,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '31%',
    aspectRatio: 0.9,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#fff',
  },
  checkIcon: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    zIndex: 1,
  },
  selectedCard: {
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontFamily: 'DMSans-Medium',
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  selectedCategoryName: {
    color: '#0f172a',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 16,
  },
  primaryButton: {
    backgroundColor: '#1a1a1a',
    width: '100%',
    height: 56,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 16,
    color: '#fff',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  skipText: {
    fontFamily: 'DMSans-Regular',
    fontSize: 15,
    color: '#888',
  },
});
