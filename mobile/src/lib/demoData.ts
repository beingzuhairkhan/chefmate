import type { Recipe, PantryItem, GroceryItem, Category, Unit } from '@/types';
import { addDays, startOfWeek } from './utils';
import { RECIPE_IMAGES } from './images';

const now = new Date();

export const DEMO_RECIPES: Recipe[] = [
  {
    id: 'r_paneer_tikka',
    title: 'Creamy Paneer Tikka Masala',
    description:
      'Charred paneer cubes simmered in a silky tomato-onion gravy with warm spices and a touch of cream. A restaurant classic you can make in 35 minutes.',
    image: RECIPE_IMAGES.paneerTikka,
    ingredients: [
      { name: 'Paneer', quantity: 250, unit: 'g' },
      { name: 'Tomatoes', quantity: 4, unit: 'pcs' },
      { name: 'Onion', quantity: 1, unit: 'pcs' },
      { name: 'Garlic', quantity: 3, unit: 'pcs' },
      { name: 'Butter', quantity: 2, unit: 'tbsp' },
      { name: 'Heavy Cream', quantity: 100, unit: 'ml' },
      { name: 'Garam Masala', quantity: 2, unit: 'tsp' },
    ],
    instructions: [
      'Toss paneer cubes with a pinch of garam masala and sear in butter until golden on all sides. Set aside.',
      'Blend tomatoes and onion into a smooth puree, then sauté in the same pan for 8 minutes until darkened and thick.',
      'Add minced garlic and garam masala; cook 1 minute until fragrant.',
      'Stir in cream and 100ml water, simmer 5 minutes until silky.',
      'Return paneer to the pan, simmer 3 minutes, and finish with fresh coriander.',
    ],
    prepTime: 10,
    cookingTime: 25,
    servings: 2,
    difficulty: 'Medium',
    cuisine: 'Indian',
    dietaryTags: ['Vegetarian', 'Gluten-Free'],
    nutrition: { calories: 520, protein: 22, carbs: 18, fat: 38, fiber: 4 },
    estimatedPrice: 6.4,
    isFavorite: true,
    createdAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
  },
  {
    id: 'r_pasta_pesto',
    title: 'Mushroom Pesto Pasta',
    description:
      'Al dente pasta tossed with sautéed mushrooms and a bright basil pesto, finished with toasted pine nuts and parmesan.',
    image: RECIPE_IMAGES.pastaPesto,
    ingredients: [
      { name: 'Pasta', quantity: 200, unit: 'g' },
      { name: 'Mushrooms', quantity: 150, unit: 'g' },
      { name: 'Basil Pesto', quantity: 3, unit: 'tbsp' },
      { name: 'Garlic', quantity: 2, unit: 'pcs' },
      { name: 'Olive Oil', quantity: 2, unit: 'tbsp' },
      { name: 'Parmesan', quantity: 30, unit: 'g' },
    ],
    instructions: [
      'Boil the pasta in salted water until al dente. Reserve a cup of pasta water before draining.',
      'Sear mushrooms in olive oil over high heat until browned, about 5 minutes.',
      'Add garlic and cook 30 seconds until fragrant.',
      'Toss in pasta, pesto and a splash of pasta water until glossy.',
      'Serve topped with parmesan and cracked pepper.',
    ],
    prepTime: 8,
    cookingTime: 15,
    servings: 2,
    difficulty: 'Easy',
    cuisine: 'Italian',
    dietaryTags: ['Vegetarian'],
    nutrition: { calories: 610, protein: 19, carbs: 72, fat: 26, fiber: 5 },
    estimatedPrice: 5.2,
    isFavorite: false,
    createdAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
  },
  {
    id: 'r_chicken_bowl',
    title: 'Grilled Chicken & Avocado Bowl',
    description:
      'Smoky grilled chicken over seasoned rice with avocado, cherry tomatoes and a lime yogurt drizzle. High protein, meal-prep friendly.',
    image: RECIPE_IMAGES.chickenAvocado,
    ingredients: [
      { name: 'Chicken Breast', quantity: 300, unit: 'g' },
      { name: 'Rice', quantity: 150, unit: 'g' },
      { name: 'Avocado', quantity: 1, unit: 'pcs' },
      { name: 'Cherry Tomatoes', quantity: 8, unit: 'pcs' },
      { name: 'Greek Yogurt', quantity: 3, unit: 'tbsp' },
      { name: 'Lime', quantity: 1, unit: 'pcs' },
    ],
    instructions: [
      'Marinate chicken in smoked paprika, cumin, salt and lime juice for 10 minutes.',
      'Cook rice according to package directions.',
      'Grill chicken 6 minutes per side until charred and cooked through. Rest, then slice.',
      'Assemble bowls with rice, sliced chicken, avocado and tomatoes.',
      'Drizzle with lime-yogurt sauce and serve.',
    ],
    prepTime: 15,
    cookingTime: 20,
    servings: 2,
    difficulty: 'Easy',
    cuisine: 'Mexican',
    dietaryTags: ['High Protein', 'Gluten-Free'],
    nutrition: { calories: 580, protein: 42, carbs: 48, fat: 22, fiber: 8 },
    estimatedPrice: 7.8,
    isFavorite: true,
    createdAt: new Date(now.getTime() - 1 * 86400000).toISOString(),
  },
  {
    id: 'r_pancakes',
    title: 'Berry Bliss Pancakes',
    description:
      'Fluffy buttermilk pancakes stacked with fresh berries and a drizzle of maple syrup. A weekend breakfast worth waking up for.',
    image: RECIPE_IMAGES.pancakes,
    ingredients: [
      { name: 'Flour', quantity: 200, unit: 'g' },
      { name: 'Eggs', quantity: 2, unit: 'pcs' },
      { name: 'Milk', quantity: 300, unit: 'ml' },
      { name: 'Butter', quantity: 3, unit: 'tbsp' },
      { name: 'Baking Powder', quantity: 2, unit: 'tsp' },
      { name: 'Mixed Berries', quantity: 150, unit: 'g' },
      { name: 'Maple Syrup', quantity: 4, unit: 'tbsp' },
    ],
    instructions: [
      'Whisk flour, baking powder, sugar and a pinch of salt in a large bowl.',
      'In another bowl, whisk eggs, milk and melted butter.',
      'Combine wet and dry ingredients until just mixed — lumps are fine.',
      'Cook 1/4-cup portions on a buttered pan, 2 minutes per side until golden.',
      'Stack, top with berries and warm maple syrup.',
    ],
    prepTime: 10,
    cookingTime: 15,
    servings: 4,
    difficulty: 'Easy',
    cuisine: 'American',
    dietaryTags: ['Vegetarian'],
    nutrition: { calories: 450, protein: 12, carbs: 68, fat: 14, fiber: 3 },
    estimatedPrice: 4.6,
    isFavorite: false,
    createdAt: new Date(now.getTime() - 6 * 86400000).toISOString(),
  },
  {
    id: 'r_tomato_soup',
    title: 'Roasted Tomato & Basil Soup',
    description:
      'Slow-roasted tomatoes blended with garlic and fresh basil into a velvety soup. Serve with crusty bread for dipping.',
    image: RECIPE_IMAGES.tomatoSoup,
    ingredients: [
      { name: 'Tomatoes', quantity: 6, unit: 'pcs' },
      { name: 'Garlic', quantity: 4, unit: 'pcs' },
      { name: 'Onion', quantity: 1, unit: 'pcs' },
      { name: 'Olive Oil', quantity: 3, unit: 'tbsp' },
      { name: 'Fresh Basil', quantity: 1, unit: 'pack' },
      { name: 'Vegetable Stock', quantity: 500, unit: 'ml' },
    ],
    instructions: [
      'Preheat oven to 200°C. Halve tomatoes and scatter with garlic, onion and olive oil.',
      'Roast for 25 minutes until caramelized at the edges.',
      'Blend roasted vegetables with basil and stock until smooth.',
      'Simmer 10 minutes, season, and serve with a swirl of cream.',
    ],
    prepTime: 10,
    cookingTime: 35,
    servings: 3,
    difficulty: 'Easy',
    cuisine: 'Italian',
    dietaryTags: ['Vegetarian', 'Vegan Option', 'Gluten-Free'],
    nutrition: { calories: 210, protein: 5, carbs: 22, fat: 12, fiber: 6 },
    estimatedPrice: 3.9,
    isFavorite: false,
    createdAt: new Date(now.getTime() - 3 * 86400000).toISOString(),
  },
  {
    id: 'r_poke_bowl',
    title: 'Rainbow Tofu Poke Bowl',
    description:
      'Marinated crispy tofu over sushi rice with edamame, avocado, pickled carrot and a sesame-soy dressing.',
    image: RECIPE_IMAGES.pokeBowl,
    ingredients: [
      { name: 'Firm Tofu', quantity: 200, unit: 'g' },
      { name: 'Sushi Rice', quantity: 150, unit: 'g' },
      { name: 'Edamame', quantity: 100, unit: 'g' },
      { name: 'Avocado', quantity: 1, unit: 'pcs' },
      { name: 'Carrot', quantity: 1, unit: 'pcs' },
      { name: 'Soy Sauce', quantity: 3, unit: 'tbsp' },
      { name: 'Sesame Oil', quantity: 1, unit: 'tbsp' },
    ],
    instructions: [
      'Press tofu dry, cube, and marinate in soy sauce and sesame oil for 10 minutes.',
      'Cook sushi rice and season with rice vinegar.',
      'Pan-fry tofu until crisp on all sides.',
      'Assemble bowls with rice, tofu, edamame, avocado and shaved carrot.',
      'Drizzle with remaining marinade and sprinkle sesame seeds.',
    ],
    prepTime: 15,
    cookingTime: 20,
    servings: 2,
    difficulty: 'Medium',
    cuisine: 'Japanese',
    dietaryTags: ['Vegan', 'High Protein'],
    nutrition: { calories: 540, protein: 24, carbs: 62, fat: 20, fiber: 9 },
    estimatedPrice: 6.1,
    isFavorite: false,
    createdAt: new Date(now.getTime() - 5 * 86400000).toISOString(),
  },
  {
    id: 'r_chicken_tacos',
    title: 'Street-Style Chicken Tacos',
    description:
      'Juicy lime-marinated chicken in warm tortillas with guacamole, pickled onion and fresh coriander.',
    image: RECIPE_IMAGES.tacos,
    ingredients: [
      { name: 'Chicken Thigh', quantity: 400, unit: 'g' },
      { name: 'Tortillas', quantity: 8, unit: 'pcs' },
      { name: 'Avocado', quantity: 1, unit: 'pcs' },
      { name: 'Red Onion', quantity: 1, unit: 'pcs' },
      { name: 'Lime', quantity: 2, unit: 'pcs' },
      { name: 'Coriander', quantity: 1, unit: 'pack' },
    ],
    instructions: [
      'Marinate chicken thighs in lime juice, cumin, chili and oregano for 15 minutes.',
      'Grill 5 minutes per side until charred. Rest and slice.',
      'Mash avocado with salt and lime for a quick guacamole.',
      'Char tortillas directly over the flame or in a dry pan.',
      'Build tacos with chicken, guacamole, pickled onion and coriander.',
    ],
    prepTime: 20,
    cookingTime: 15,
    servings: 4,
    difficulty: 'Easy',
    cuisine: 'Mexican',
    dietaryTags: ['High Protein'],
    nutrition: { calories: 490, protein: 32, carbs: 38, fat: 24, fiber: 7 },
    estimatedPrice: 8.2,
    isFavorite: false,
    createdAt: new Date(now.getTime() - 7 * 86400000).toISOString(),
  },
  {
    id: 'r_mattar_paneer',
    title: 'One-Pot Mattar Paneer',
    description:
      'A comforting weeknight curry of paneer and green peas in a spiced tomato gravy, ready in one pot.',
    image: RECIPE_IMAGES.mattarPaneer,
    ingredients: [
      { name: 'Paneer', quantity: 200, unit: 'g' },
      { name: 'Green Peas', quantity: 150, unit: 'g' },
      { name: 'Tomatoes', quantity: 3, unit: 'pcs' },
      { name: 'Onion', quantity: 1, unit: 'pcs' },
      { name: 'Ginger-Garlic Paste', quantity: 2, unit: 'tbsp' },
      { name: 'Cumin Seeds', quantity: 1, unit: 'tsp' },
    ],
    instructions: [
      'Fry paneer cubes until light golden; set aside.',
      'Sizzle cumin seeds, then cook onion and ginger-garlic paste until soft.',
      'Add tomato puree and spices; cook until oil separates.',
      'Add peas and 100ml water; simmer 8 minutes.',
      'Stir in paneer, rest 2 minutes, and serve with rice or roti.',
    ],
    prepTime: 8,
    cookingTime: 22,
    servings: 3,
    difficulty: 'Easy',
    cuisine: 'Indian',
    dietaryTags: ['Vegetarian', 'Gluten-Free'],
    nutrition: { calories: 460, protein: 20, carbs: 24, fat: 30, fiber: 6 },
    estimatedPrice: 5.5,
    isFavorite: true,
    createdAt: new Date(now.getTime() - 8 * 86400000).toISOString(),
  },
  {
    id: 'r_chicken_biryani',
    title: 'Weeknight Chicken Biryani',
    description:
      'Fragrant basmati rice layered with spiced chicken, caramelized onions and saffron. Simplified for a weeknight, big on flavor.',
    image: RECIPE_IMAGES.biryani,
    ingredients: [
      { name: 'Chicken Thigh', quantity: 500, unit: 'g' },
      { name: 'Basmati Rice', quantity: 300, unit: 'g' },
      { name: 'Onion', quantity: 2, unit: 'pcs' },
      { name: 'Yogurt', quantity: 150, unit: 'g' },
      { name: 'Biryani Masala', quantity: 3, unit: 'tbsp' },
      { name: 'Saffron', quantity: 1, unit: 'tsp' },
    ],
    instructions: [
      'Marinate chicken in yogurt, biryani masala and half the fried onions for 30 minutes.',
      'Parboil soaked basmati rice with whole spices until 70% cooked.',
      'Layer marinated chicken and rice in a heavy pot with saffron water.',
      'Seal and steam on low heat (dum) for 25 minutes.',
      'Rest 10 minutes, then fluff and serve with raita.',
    ],
    prepTime: 30,
    cookingTime: 45,
    servings: 4,
    difficulty: 'Hard',
    cuisine: 'Indian',
    dietaryTags: ['High Protein'],
    nutrition: { calories: 680, protein: 38, carbs: 78, fat: 24, fiber: 4 },
    estimatedPrice: 11.5,
    isFavorite: false,
    createdAt: new Date(now.getTime() - 10 * 86400000).toISOString(),
  },
];

export const DEMO_PANTRY: PantryItem[] = [
  { id: 'p1', name: 'Tomatoes', quantity: 4, unit: 'pcs', category: 'Vegetables', expiryDate: formatDate(addDays(now, 2)), addedAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
  { id: 'p2', name: 'Onion', quantity: 2, unit: 'pcs', category: 'Vegetables', expiryDate: formatDate(addDays(now, 6)), addedAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
  { id: 'p3', name: 'Milk', quantity: 1, unit: 'L', category: 'Dairy', expiryDate: formatDate(addDays(now, 1)), addedAt: new Date(now.getTime() - 5 * 86400000).toISOString() },
  { id: 'p4', name: 'Eggs', quantity: 6, unit: 'pcs', category: 'Dairy', expiryDate: formatDate(addDays(now, 5)), addedAt: new Date(now.getTime() - 5 * 86400000).toISOString() },
  { id: 'p5', name: 'Spinach', quantity: 200, unit: 'g', category: 'Vegetables', expiryDate: formatDate(addDays(now, 3)), addedAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
  { id: 'p6', name: 'Paneer', quantity: 250, unit: 'g', category: 'Dairy', expiryDate: formatDate(addDays(now, 4)), addedAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
  { id: 'p7', name: 'Potatoes', quantity: 1, unit: 'kg', category: 'Vegetables', expiryDate: formatDate(addDays(now, 9)), addedAt: new Date(now.getTime() - 6 * 86400000).toISOString() },
  { id: 'p8', name: 'Garlic', quantity: 1, unit: 'pack', category: 'Vegetables', expiryDate: formatDate(addDays(now, 14)), addedAt: new Date(now.getTime() - 6 * 86400000).toISOString() },
  { id: 'p9', name: 'Butter', quantity: 250, unit: 'g', category: 'Dairy', expiryDate: formatDate(addDays(now, -1)), addedAt: new Date(now.getTime() - 20 * 86400000).toISOString() },
  { id: 'p10', name: 'Rice', quantity: 2, unit: 'kg', category: 'Grains', expiryDate: formatDate(addDays(now, 90)), addedAt: new Date(now.getTime() - 30 * 86400000).toISOString() },
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export const DEMO_GROCERY: GroceryItem[] = [
  { id: 'g1', name: 'Heavy Cream', quantity: 100, unit: 'ml', category: 'Dairy', estimatedPrice: 1.8, purchased: false },
  { id: 'g2', name: 'Bell Peppers', quantity: 3, unit: 'pcs', category: 'Vegetables', estimatedPrice: 2.4, purchased: false },
  { id: 'g3', name: 'Basil Pesto', quantity: 1, unit: 'pack', category: 'Other', estimatedPrice: 3.2, purchased: false },
  { id: 'g4', name: 'Chicken Breast', quantity: 300, unit: 'g', category: 'Meat & Seafood', estimatedPrice: 4.5, purchased: false },
  { id: 'g5', name: 'Avocado', quantity: 2, unit: 'pcs', category: 'Fruits', estimatedPrice: 2.0, purchased: true },
  { id: 'g6', name: 'Greek Yogurt', quantity: 200, unit: 'g', category: 'Dairy', estimatedPrice: 1.5, purchased: true },
  { id: 'g7', name: 'Bananas', quantity: 6, unit: 'pcs', category: 'Fruits', estimatedPrice: 1.2, purchased: false },
];

export const DEMO_FRIDGE_SCAN = [
  { name: 'Tomatoes', quantity: 3, unit: 'pcs' as Unit, confidence: 0.96 },
  { name: 'Onion', quantity: 2, unit: 'pcs' as Unit, confidence: 0.93 },
  { name: 'Milk', quantity: 1, unit: 'L' as Unit, confidence: 0.98 },
  { name: 'Eggs', quantity: 6, unit: 'pcs' as Unit, confidence: 0.95 },
  { name: 'Spinach', quantity: 200, unit: 'g' as Unit, confidence: 0.88 },
  { name: 'Paneer', quantity: 250, unit: 'g' as Unit, confidence: 0.91 },
];

export function categoryFor(name: string): Category {
  const n = name.toLowerCase();
  const veg = ['tomato', 'onion', 'spinach', 'potato', 'garlic', 'carrot', 'pepper', 'mushroom', 'peas', 'coriander', 'basil', 'ginger', 'cucumber', 'lettuce'];
  const fruit = ['apple', 'banana', 'berry', 'berries', 'mango', 'orange', 'lime', 'lemon', 'avocado', 'grape'];
  const dairy = ['milk', 'paneer', 'cheese', 'yogurt', 'butter', 'cream', 'egg'];
  const grain = ['rice', 'flour', 'pasta', 'bread', 'oat', 'quinoa', 'noodle', 'tortilla'];
  const spice = ['masala', 'cumin', 'turmeric', 'salt', 'pepper powder', 'chili', 'paprika', 'cinnamon', 'saffron', 'oregano'];
  const meat = ['chicken', 'beef', 'pork', 'fish', 'shrimp', 'lamb', 'tofu', 'salmon'];
  if (veg.some((k) => n.includes(k))) return 'Vegetables';
  if (fruit.some((k) => n.includes(k))) return 'Fruits';
  if (dairy.some((k) => n.includes(k))) return 'Dairy';
  if (grain.some((k) => n.includes(k))) return 'Grains';
  if (spice.some((k) => n.includes(k))) return 'Spices';
  if (meat.some((k) => n.includes(k))) return 'Meat & Seafood';
  return 'Other';
}

export function estimatePrice(item: { name: string; quantity: number; unit: Unit }): number {
  const base: Record<string, number> = {
    Vegetables: 0.6, Fruits: 0.5, Dairy: 1.2, Grains: 0.9, Spices: 1.5, 'Meat & Seafood': 3.2, Other: 1.0,
  };
  const cat = categoryFor(item.name);
  const factor = ['pcs', 'pack'].includes(item.unit) ? 1 : item.quantity / 250;
  return Math.round(base[cat] * Math.max(1, factor) * 20) / 20;
}

export function weekStartLabel(): string {
  return startOfWeek(new Date()).toISOString().slice(0, 10);
}
