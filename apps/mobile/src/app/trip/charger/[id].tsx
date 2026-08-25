// ──────────────────────────────────────────────
// Charger Details Screen (Stack)
// Shows station info, AI predictions, reliability,
// and interactive Phase 4 user feedback submission.
// ──────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { GlassCard, GlassInput, GlassButton, StatusBadge } from '@/components/ui';
import { colors, fontFamily, fontSize, fontWeight, spacing } from '@/theme';
import {
  getStation,
  getStationPredictions,
  getStationStatus,
  submitStationFeedback,
  type ChargingStation,
  type StationPrediction,
  type StationStatus,
} from '@/api/stations';

export default function ChargerDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [station, setStation] = useState<ChargingStation | null>(null);
  const [predictions, setPredictions] = useState<StationPrediction | null>(null);
  const [status, setStatus] = useState<StationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Feedback form state
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [brokenPlugs, setBrokenPlugs] = useState('0');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);

      try {
        const [stationRes, predRes, statusRes] = await Promise.all([
          getStation(id),
          getStationPredictions(id),
          getStationStatus(id),
        ]);

        if (stationRes.success && stationRes.data) {
          setStation(stationRes.data);
        }
        if (predRes.success && predRes.data) {
          setPredictions(predRes.data);
        }
        if (statusRes.success && statusRes.data) {
          setStatus(statusRes.data);
        }
      } catch {
        // Fallbacks for offline demo
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleSubmitFeedback = async () => {
    if (!id) return;
    setSubmittingFeedback(true);
    setFeedbackError(null);
    setFeedbackSuccess(false);

    try {
      const res = await submitStationFeedback(id, {
        rating,
        comments: comments.trim() || undefined,
        broken_plugs: parseInt(brokenPlugs, 10) || 0,
      });

      if (res.success) {
        setFeedbackSuccess(true);
        setComments('');
      } else {
        setFeedbackError(res.error?.message || 'Failed to submit feedback.');
      }
    } catch (err: any) {
      setFeedbackError(err.message || 'An error occurred.');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const displayName = station?.name || 'Lonavala Supercharging Hub';
  const displayAddress = 'NH48 Highway Corridor, Maharashtra';
  const displayPower = station?.max_power_kw ? `${station.max_power_kw} kW` : '150 kW';
  const displayOperator = station?.operator_name || 'Tata Power / Jio-bp';

  const waitTime = predictions?.expectedWaitMinutes ?? 8;
  const reliability = predictions?.reliabilityScore ? predictions.reliabilityScore.toFixed(2) : '0.88';
  const confidence = predictions?.confidenceScore ? Math.round(predictions.confidenceScore * 100) : 85;
  const isAvailable = predictions?.predictedAvailable ?? true;

  return (
    <LinearGradient
      colors={[colors.bgStart, colors.bgEnd]}
      style={styles.gradient}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backBtn}>← Back</Text>
          </Pressable>
          <Text style={styles.screenTitle}>Charger Hub Details</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={colors.primary} size="large" style={{ marginVertical: 40 }} />
        ) : (
          <>
            {/* Station Info */}
            <GlassCard intense style={styles.mainCard}>
              <Text style={styles.stationName}>{displayName}</Text>
              <Text style={styles.stationAddress}>{displayAddress}</Text>
              <View style={styles.tagsRow}>
                <StatusBadge label={displayOperator} variant="info" />
                <StatusBadge label={displayPower} variant="info" />
                <StatusBadge label="CCS2 Fast DC" variant="info" />
                <StatusBadge
                  label={status?.status === 'ONLINE' ? 'Live Online' : 'Active Node'}
                  variant="success"
                />
              </View>
            </GlassCard>

            {/* AI Predictions */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>AI Availability & Wait Predictions</Text>
              <GlassCard>
                <View style={styles.predRow}>
                  <View style={styles.predBlock}>
                    <Text
                      style={[
                        styles.predValue,
                        { color: isAvailable ? colors.success : colors.warning },
                      ]}
                    >
                      {isAvailable ? 'Likely Open' : 'Congested'}
                    </Text>
                    <Text style={styles.predLabel}>Availability</Text>
                  </View>
                  <View style={styles.predDivider} />
                  <View style={styles.predBlock}>
                    <Text style={styles.predValue}>~{waitTime} min</Text>
                    <Text style={styles.predLabel}>Predicted Wait</Text>
                  </View>
                  <View style={styles.predDivider} />
                  <View style={styles.predBlock}>
                    <Text style={styles.predValue}>{reliability}</Text>
                    <Text style={styles.predLabel}>Reliability Score</Text>
                  </View>
                </View>
              </GlassCard>

              <GlassCard>
                <View style={styles.confidenceRow}>
                  <Text style={styles.confidenceLabel}>ML Model Confidence</Text>
                  <View style={styles.confidenceBarBg}>
                    <View style={[styles.confidenceBarFill, { width: `${confidence}%` }]} />
                  </View>
                  <Text style={styles.confidenceValue}>{confidence}%</Text>
                </View>
                <Text style={styles.confidenceNote}>
                  Based on historical occupancy patterns, time of day, and live sensor updates.
                </Text>
              </GlassCard>
            </View>

            {/* Phase 4: Driver Community Feedback */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Submit Driver Feedback</Text>
              <GlassCard style={styles.feedbackCard}>
                <Text style={styles.feedbackSubtitle}>
                  Help fellow EV drivers by reporting charger reliability and plug conditions.
                </Text>

                {feedbackSuccess && (
                  <View style={styles.successBox}>
                    <Text style={styles.successText}>
                      ✓ Thank you! Your feedback has been recorded into the system.
                    </Text>
                  </View>
                )}

                {feedbackError && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{feedbackError}</Text>
                  </View>
                )}

                {/* Rating Selector */}
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Station Rating:</Text>
                  <View style={styles.starsRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Pressable key={star} onPress={() => setRating(star)}>
                        <Text
                          style={[
                            styles.starIcon,
                            { color: star <= rating ? '#fbbf24' : 'rgba(255,255,255,0.2)' },
                          ]}
                        >
                          ★
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <GlassInput
                  label="Broken / Faulty Plugs Count"
                  placeholder="0"
                  value={brokenPlugs}
                  onChangeText={setBrokenPlugs}
                  keyboardType="numeric"
                />

                <GlassInput
                  label="Comments / Notes"
                  placeholder="e.g. Smooth 150kW fast charge, canopy available"
                  value={comments}
                  onChangeText={setComments}
                />

                <GlassButton
                  title={submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                  variant="primary"
                  size="md"
                  fullWidth
                  onPress={handleSubmitFeedback}
                  disabled={submittingFeedback}
                />
              </GlassCard>
            </View>
          </>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing['5'],
    paddingTop: spacing['16'],
    paddingBottom: 40,
    gap: spacing['5'],
  },
  header: {
    gap: spacing['2'],
  },
  backBtn: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.primary,
    marginBottom: spacing['1'],
  },
  screenTitle: {
    fontFamily,
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  mainCard: {
    gap: spacing['3'],
  },
  stationName: {
    fontFamily,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  stationAddress: {
    fontFamily,
    fontSize: fontSize.base,
    color: colors.textSecondary,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: spacing['2'],
    flexWrap: 'wrap',
  },
  section: {
    gap: spacing['3'],
  },
  sectionTitle: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
    color: colors.textPrimary,
  },
  predRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  predBlock: {
    flex: 1,
    alignItems: 'center',
    gap: spacing['1'],
  },
  predValue: {
    fontFamily,
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  predLabel: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  predDivider: {
    width: 1,
    height: 36,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing['3'],
  },
  confidenceLabel: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  confidenceBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  confidenceBarFill: {
    height: '100%',
    backgroundColor: colors.success,
    borderRadius: 3,
  },
  confidenceValue: {
    fontFamily,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.success,
    width: 42,
    textAlign: 'right',
  },
  confidenceNote: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textTertiary,
    marginTop: spacing['2'],
    lineHeight: 18,
  },
  feedbackCard: {
    gap: spacing['3'],
  },
  feedbackSubtitle: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing['1'],
  },
  ratingLabel: {
    fontFamily,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: fontWeight.medium,
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing['2'],
  },
  starIcon: {
    fontSize: 24,
  },
  successBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing['3'],
  },
  successText: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.success,
    fontWeight: fontWeight.medium,
  },
  errorBox: {
    backgroundColor: colors.dangerMuted,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 8,
    padding: spacing['3'],
  },
  errorText: {
    fontFamily,
    fontSize: fontSize.xs,
    color: colors.danger,
  },
});
