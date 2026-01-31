export const DIETARY_TAGS = [
  { id: 'vegan', label: 'Vegan', emoji: '🌱' },
  { id: 'vegetarian', label: 'Vegetarian', emoji: '🥬' },
  { id: 'halal', label: 'Halal', emoji: '🕌' },
  { id: 'kosher', label: 'Kosher', emoji: '✡️' },
  { id: 'gluten_free', label: 'Gluten-Free', emoji: '🌾' },
  { id: 'nut_free', label: 'Nut-Free', emoji: '🥜' },
  { id: 'dairy_free', label: 'Dairy-Free', emoji: '🥛' },
  { id: 'shellfish_free', label: 'Shellfish-Free', emoji: '🦐' },
  { id: 'egg_free', label: 'Egg-Free', emoji: '🥚' },
  { id: 'soy_free', label: 'Soy-Free', emoji: '🫘' },
  { id: 'low_sodium', label: 'Low Sodium', emoji: '🧂' },
  { id: 'diabetic_friendly', label: 'Diabetic-Friendly', emoji: '💉' },
] as const;

export type DietaryTagId = typeof DIETARY_TAGS[number]['id'];
