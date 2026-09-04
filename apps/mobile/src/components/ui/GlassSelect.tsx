// ──────────────────────────────────────────────
// GlassSelect — frosted-glass dropdown picker
// Matches the VOLT glassmorphic design system.
// ──────────────────────────────────────────────

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  Modal,
  FlatList,
  TextInput,
  type ViewStyle,
  type StyleProp,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { colors, fontFamily, fontSize, fontWeight, glassEffect, radius, spacing } from '@/theme';

export interface SelectOption {
  key: string;
  label: string;
  subtitle?: string;
  icon?: string;
}

interface GlassSelectProps {
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  value: string | null;
  onSelect: (key: string) => void;
  error?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}

export function GlassSelect({
  label,
  placeholder = 'Select an option',
  options,
  value,
  onSelect,
  error,
  searchable = false,
  searchPlaceholder = 'Search...',
  style,
  disabled = false,
}: GlassSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const borderOpacity = useSharedValue(0);

  const selectedOption = options.find((o) => o.key === value);

  const filteredOptions = searchable && search.trim()
    ? options.filter(
        (o) =>
          o.label.toLowerCase().includes(search.toLowerCase()) ||
          o.subtitle?.toLowerCase().includes(search.toLowerCase()),
      )
    : options;

  const animatedBorder = useAnimatedStyle(() => ({
    borderColor: `rgba(99, 102, 241, ${borderOpacity.value})`,
  }));

  const handleOpen = useCallback(() => {
    if (disabled) return;
    borderOpacity.value = withTiming(0.5, { duration: 200 });
    setOpen(true);
    setSearch('');
  }, [disabled]);

  const handleClose = useCallback(() => {
    borderOpacity.value = withTiming(0, { duration: 200 });
    setOpen(false);
  }, []);

  const handleSelect = useCallback((key: string) => {
    onSelect(key);
    handleClose();
  }, [onSelect, handleClose]);

  const renderOption = useCallback(({ item }: { item: SelectOption }) => {
    const isActive = item.key === value;
    return (
      <Pressable
        onPress={() => handleSelect(item.key)}
        style={({ pressed }) => [
          styles.optionItem,
          isActive && styles.optionItemActive,
          pressed && styles.optionItemPressed,
        ]}
      >
        {item.icon && <Text style={styles.optionIcon}>{item.icon}</Text>}
        <View style={styles.optionTextBlock}>
          <Text
            style={[
              styles.optionLabel,
              isActive && styles.optionLabelActive,
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          {item.subtitle && (
            <Text style={styles.optionSubtitle} numberOfLines={1}>
              {item.subtitle}
            </Text>
          )}
        </View>
        {isActive && <Text style={styles.checkmark}>✓</Text>}
      </Pressable>
    );
  }, [value, handleSelect]);

  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable onPress={handleOpen} disabled={disabled}>
        <Animated.View
          style={[
            styles.trigger,
            animatedBorder,
            disabled && styles.triggerDisabled,
            style,
          ]}
        >
          <Text
            style={[
              styles.triggerText,
              !selectedOption && styles.triggerPlaceholder,
            ]}
            numberOfLines={1}
          >
            {selectedOption
              ? `${selectedOption.icon ? selectedOption.icon + ' ' : ''}${selectedOption.label}`
              : placeholder}
          </Text>
          <Text style={styles.chevron}>▾</Text>
        </Animated.View>
      </Pressable>
      {error && <Text style={styles.error}>{error}</Text>}

      {/* Modal Dropdown */}
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <Pressable style={styles.overlay} onPress={handleClose}>
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={styles.overlayBg}
          />
        </Pressable>

        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(200)}
          exiting={SlideOutDown.duration(150)}
          style={styles.sheet}
        >
          <LinearGradient
            colors={['#1a1a2e', '#16162a']}
            style={styles.sheetGradient}
          >
            {/* Handle */}
            <View style={styles.sheetHandle}>
              <View style={styles.handleBar} />
            </View>

            {/* Title */}
            <Text style={styles.sheetTitle}>{label || 'Select'}</Text>

            {/* Search */}
            {searchable && (
              <View style={styles.searchContainer}>
                <Text style={styles.searchIcon}>🔍</Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textTertiary}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch('')}>
                    <Text style={styles.clearBtn}>✕</Text>
                  </Pressable>
                )}
              </View>
            )}

            {/* Options List */}
            <FlatList
              data={filteredOptions}
              keyExtractor={(item) => item.key}
              renderItem={renderOption}
              style={styles.optionsList}
              contentContainerStyle={styles.optionsContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No results found</Text>
                </View>
              }
            />

            {/* Cancel */}
            <Pressable onPress={handleClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing['1'],
  },
  label: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
    marginBottom: spacing['1'],
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: glassEffect.overlayColor,
    borderWidth: 1,
    borderColor: glassEffect.borderColor,
    borderRadius: radius.md,
    paddingHorizontal: spacing['4'],
    paddingVertical: spacing['3'],
    minHeight: 48,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerText: {
    flex: 1,
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textPrimary,
  },
  triggerPlaceholder: {
    color: colors.textTertiary,
  },
  chevron: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing['2'],
  },
  error: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: spacing['1'],
  },
  // ── Modal ──
  overlay: {
    flex: 1,
  },
  overlayBg: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '70%',
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: 'hidden',
  },
  sheetGradient: {
    flex: 1,
    paddingBottom: spacing['6'],
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomWidth: 0,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: spacing['3'],
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  sheetTitle: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing['3'],
  },
  // ── Search ──
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
    marginHorizontal: spacing['4'],
    marginBottom: spacing['3'],
    paddingHorizontal: spacing['3'],
    gap: spacing['2'],
    height: 44,
  },
  searchIcon: {
    fontSize: 14,
    opacity: 0.6,
  },
  searchInput: {
    flex: 1,
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textPrimary,
    padding: 0,
    margin: 0,
  },
  clearBtn: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    padding: spacing['1'],
  },
  // ── Options ──
  optionsList: {
    flex: 1,
  },
  optionsContent: {
    paddingHorizontal: spacing['2'],
    paddingBottom: spacing['2'],
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing['3'],
    paddingHorizontal: spacing['3'],
    marginHorizontal: spacing['2'],
    borderRadius: radius.sm,
    gap: spacing['3'],
  },
  optionItemActive: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
  },
  optionItemPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  optionIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  optionTextBlock: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontFamily,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
  },
  optionLabelActive: {
    color: colors.primary,
  },
  optionSubtitle: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  checkmark: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing['8'],
  },
  emptyText: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textTertiary,
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: spacing['3'],
    marginHorizontal: spacing['4'],
    marginTop: spacing['2'],
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cancelText: {
    fontFamily,
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    color: colors.textSecondary,
  },
});
