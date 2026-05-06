import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Send } from 'lucide-react-native';

interface InputBarProps {
  onSend: (text: string) => void;
  isLoading?: boolean;
}

export default function InputBar({ onSend, isLoading }: InputBarProps) {
  const [text, setText] = useState('');

  const handleSend = () => {
    if (text.trim()) {
      onSend(text);
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inner}>
        <TextInput
          style={styles.input}
          placeholder="Capture a thought or ask anything..."
          placeholderTextColor="#94a3b8"
          value={text}
          onChangeText={setText}
          multiline
          maxHeight={120}
        />
        <TouchableOpacity
          style={[styles.sendButton, !text.trim() && styles.disabledButton]}
          onPress={handleSend}
          disabled={!text.trim() || isLoading}
        >
          <Send size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: 'transparent',
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#1e293b',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  input: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    paddingTop: 8,
    paddingBottom: 8,
    marginRight: 8,
  },
  sendButton: {
    backgroundColor: '#6366f1',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  disabledButton: {
    backgroundColor: '#334155',
  },
});
