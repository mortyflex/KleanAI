export const user = {
  name: "Mohamed A",
  avatarInitials: "AK",
  streak: 12,
  level: "Intermediate",
};

export const todaySummary = {
  caloriesBurned: 480,
  caloriesGoal: 600,
  stepsWalked: 7240,
  stepsGoal: 10000,
  activeMinutes: 42,
  activeMinutesGoal: 60,
};

export const nutrition = {
  calories: { current: 1420, goal: 2100 },
  protein: { current: 85, goal: 150 },
  carbs: { current: 160, goal: 220 },
  fat: { current: 42, goal: 70 },
  hydration: { current: 5, goal: 8 },
};

export const workoutPlan = {
  name: "Upper Body Power",
  durationMin: 45,
  intensity: "Medium",
  exercises: [
    {
      id: "1",
      name: "Push-Ups",
      sets: 3,
      reps: 12,
      muscle: "Chest",
      category: "Strength",
      done: false,
    },
    {
      id: "2",
      name: "Dumbbell Row",
      sets: 4,
      reps: 10,
      muscle: "Back",
      category: "Strength",
      done: false,
    },
    {
      id: "3",
      name: "Overhead Press",
      sets: 3,
      reps: 8,
      muscle: "Shoulders",
      category: "Strength",
      done: true,
    },
    {
      id: "4",
      name: "Bicep Curl",
      sets: 3,
      reps: 12,
      muscle: "Biceps",
      category: "Strength",
      done: false,
    },
    {
      id: "5",
      name: "Jump Rope",
      sets: 1,
      reps: 200,
      muscle: "Full Body",
      category: "Cardio",
      done: false,
    },
    {
      id: "6",
      name: "Shoulder Stretch",
      sets: 2,
      reps: 30,
      muscle: "Shoulders",
      category: "Mobility",
      done: true,
    },
  ],
};

export const meals = [
  {
    id: "1",
    name: "Breakfast",
    time: "7:30 AM",
    calories: 420,
    items: ["Oatmeal with berries", "Greek yogurt", "Black coffee"],
    emoji: "☀️",
    logged: true,
  },
  {
    id: "2",
    name: "Lunch",
    time: "12:30 PM",
    calories: 680,
    items: ["Grilled chicken salad", "Brown rice", "Olive oil dressing"],
    emoji: "🥗",
    logged: true,
  },
  {
    id: "3",
    name: "Dinner",
    time: "7:00 PM",
    calories: 320,
    items: ["Salmon fillet", "Steamed broccoli", "Quinoa"],
    emoji: "🍽️",
    logged: true,
  },
  {
    id: "4",
    name: "Snacks",
    time: "",
    calories: 0,
    items: [],
    emoji: "🍎",
    logged: false,
  },
];
