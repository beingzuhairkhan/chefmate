import type { Recipe, PantryItem } from '@/types';

export const RECIPE_IMAGES = {
  paneerCurry:
    'https://images.pexels.com/photos/5127316/pexels-photo-5127316.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  paneerTikka:
    'https://images.pexels.com/photos/30858402/pexels-photo-30858402.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  vegCurry:
    'https://images.pexels.com/photos/35041652/pexels-photo-35041652.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  paneerPepper:
    'https://images.pexels.com/photos/12737816/pexels-photo-12737816.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  mattarPaneer:
    'https://images.pexels.com/photos/9609842/pexels-photo-9609842.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  paneerPlate:
    'https://images.pexels.com/photos/28674562/pexels-photo-28674562.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  saladChicken:
    'https://images.pexels.com/photos/9893216/pexels-photo-9893216.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  berrySalad:
    'https://images.pexels.com/photos/27400769/pexels-photo-27400769.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  pokeBowl:
    'https://images.pexels.com/photos/4828142/pexels-photo-4828142.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  pokeBowls:
    'https://images.pexels.com/photos/4828095/pexels-photo-4828095.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  pastaPesto:
    'https://images.pexels.com/photos/8917285/pexels-photo-8917285.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  pastaMushroom:
    'https://images.pexels.com/photos/17636472/pexels-photo-17636472.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  pastaHerbs:
    'https://images.pexels.com/photos/8414741/pexels-photo-8414741.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  pancakes:
    'https://images.pexels.com/photos/2532001/pexels-photo-2532001.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  pancakesSyrup:
    'https://images.pexels.com/photos/6529790/pexels-photo-6529790.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  chickenRice:
    'https://images.pexels.com/photos/12916877/pexels-photo-12916877.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  chickenAvocado:
    'https://images.pexels.com/photos/40108711/pexels-photo-40108711.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  biryani:
    'https://images.pexels.com/photos/12916869/pexels-photo-12916869.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  mandi:
    'https://images.pexels.com/photos/28898628/pexels-photo-28898628.png?auto=compress&cs=tinysrgb&h=650&w=940',
  tomatoSoup:
    'https://images.pexels.com/photos/262947/pexels-photo-262947.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  vegSoup:
    'https://images.pexels.com/photos/12309415/pexels-photo-12309415.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  currySoup:
    'https://images.pexels.com/photos/5865239/pexels-photo-5865239.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  tacos:
    'https://images.pexels.com/photos/36498696/pexels-photo-36498696.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
  tacosLime:
    'https://images.pexels.com/photos/25391591/pexels-photo-25391591.jpeg?auto=compress&cs=tinysrgb&h=650&w=940',
};

export function recipeImageForTitle(title: string): string {
  const normalized = title.toLowerCase();
  if (/\b(poha|oats|pancake|idli|omelette|breakfast|upma|paratha)\b/.test(normalized)) {
    return RECIPE_IMAGES.pancakes;
  }
  if (/\b(biryani|pilaf)\b/.test(normalized)) return RECIPE_IMAGES.biryani;
  if (/\b(chicken|turkey|fish|salmon)\b/.test(normalized)) return RECIPE_IMAGES.chickenRice;
  if (/\b(pasta|noodle|spaghetti)\b/.test(normalized)) return RECIPE_IMAGES.pastaPesto;
  if (/\b(salad|poke)\b/.test(normalized)) return RECIPE_IMAGES.saladChicken;
  if (/\bpaneer\b/.test(normalized)) return RECIPE_IMAGES.paneerCurry;
  if (/\b(taco|tacos)\b/.test(normalized)) return RECIPE_IMAGES.tacos;
  return RECIPE_IMAGES.vegCurry;
}

export function ingredientImage(item: PantryItem): string {
  const map: Record<string, string> = {
    Tomatoes: 'https://images.pexels.com/photos/53536/tomato-tomatoes-fruit-vegetable-53536.jpeg?auto=compress&cs=tinysrgb&h=350&w=350',
    Onion: 'https://images.pexels.com/photos/60658/vegetables-onion-food-emerald-60658.jpeg?auto=compress&cs=tinysrgb&h=350&w=350',
    Milk: 'https://images.pexels.com/photos/248412/pexels-photo-248412.jpeg?auto=compress&cs=tinysrgb&h=350&w=350',
    Eggs: 'https://images.pexels.com/photos/162712/egg-breakfast-food-eggs-162712.jpeg?auto=compress&cs=tinysrgb&h=350&w=350',
    Spinach: 'https://images.pexels.com/photos/248092/pexels-photo-248092.jpeg?auto=compress&cs=tinysrgb&h=350&w=350',
    Paneer: RECIPE_IMAGES.paneerPlate,
    Potatoes: 'https://images.pexels.com/photos/144248/potatoes-vegetables-ernte-dirty-144248.jpeg?auto=compress&cs=tinysrgb&h=350&w=350',
    Garlic: 'https://images.pexels.com/photos/161559/background-bitter-cuisine-garlic-161559.jpeg?auto=compress&cs=tinysrgb&h=350&w=350',
    Butter: 'https://images.pexels.com/photos/253118/pexels-photo-253118.jpeg?auto=compress&cs=tinysrgb&h=350&w=350',
    Rice: 'https://images.pexels.com/photos/1393382/pexels-photo-1393382.jpeg?auto=compress&cs=tinysrgb&h=350&w=350',
  };
  return (
    map[item.name] ||
    'https://images.pexels.com/photos/1300972/pexels-photo-1300972.jpeg?auto=compress&cs=tinysrgb&h=350&w=350'
  );
}

export function recipeById(recipes: Recipe[], id: string): Recipe | undefined {
  return recipes.find((r) => r.id === id);
}
