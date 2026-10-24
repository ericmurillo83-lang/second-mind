import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAppData, useStore } from '@/data/store-context';
import { filterRecipes, formatCarbs, recipeTags } from '@/domain/meals';
import type { Recipe } from '@/domain/types';
import { Button, tapFeedback } from '@/ui/button';
import { Chip, ChipScroller } from '@/ui/controls';
import { TextField } from '@/ui/fields';
import { Icon } from '@/ui/icon';
import { EmptyState } from '@/ui/layout';
import { Badge } from '@/ui/status';
import { Text } from '@/ui/text';
import { elevation, MIN_TOUCH, radius, spacing } from '@/ui/theme';
import { useTheme } from '@/ui/theme-context';

export function RecipesView() {
  const recipes = useAppData((d) => d.recipes);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [favorites, setFavorites] = useState(false);
  const tags = useMemo(() => recipeTags(recipes), [recipes]);
  const list = useMemo(() => filterRecipes(recipes, query, tag, favorites), [recipes, query, tag, favorites]);

  if (recipes.length === 0) {
    return (
      <EmptyState
        icon="book"
        title="Your recipe box is empty"
        message="Save recipes with carbohydrates per serving, then plan your week with them."
        action={<Button label="Add a recipe" size="sm" variant="soft" icon="plus" onPress={() => router.push('/meals/recipe-edit')} />}
      />
    );
  }

  return (
    <>
      <TextField
        testID="recipe-search"
        label="Search recipes"
        placeholder="Name or ingredient"
        value={query}
        onChangeText={setQuery}
        returnKeyType="search"
        autoCorrect={false}
      />
      <ChipScroller>
        <Chip label="Favorites" icon="star" selected={favorites} onPress={() => setFavorites((f) => !f)} testID="filter-favorites" />
        <Chip label="All" selected={tag === null} onPress={() => setTag(null)} />
        {tags.map((t) => (
          <Chip key={t} label={t} selected={tag === t} onPress={() => setTag(tag === t ? null : t)} testID={`tag-${t}`} />
        ))}
      </ChipScroller>
      <Text variant="footnote" color="textSecondary" accessibilityLiveRegion="polite">
        {list.length} recipe{list.length === 1 ? '' : 's'}
      </Text>
      <View style={{ gap: spacing.md }}>
        {list.map((r) => (
          <RecipeCard key={r.id} recipe={r} />
        ))}
      </View>
    </>
  );
}

function RecipeCard({ recipe }: { recipe: Recipe }) {
  const store = useStore();
  const { colors } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, elevation(colors, 1)]}>
      <Pressable
        testID={`recipe-${recipe.id}`}
        accessibilityRole="button"
        accessibilityLabel={`${recipe.name}. ${formatCarbs(recipe.carbsPerServing)} carbs per serving, ${recipe.prepMinutes} minutes.`}
        onPress={() => {
          tapFeedback();
          router.push({ pathname: '/meals/recipe/[id]', params: { id: recipe.id } });
        }}
        style={({ pressed }) => [styles.cardBody, pressed && { opacity: 0.75 }]}>
        <View style={[styles.thumb, { backgroundColor: colors.accentSoft }]}>
          <Icon name="meals" size={22} color={colors.accent} />
        </View>
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Text variant="headline">{recipe.name}</Text>
          <Text variant="footnote" color="textSecondary" numberOfLines={2}>
            {recipe.description}
          </Text>
          <View style={styles.meta}>
            <Badge label={`${formatCarbs(recipe.carbsPerServing)} / serving`} tone="primary" icon="carbs" />
            <Badge label={`${recipe.prepMinutes} min`} icon="timer" />
            {recipe.demo ? <Badge label="Sample" tone="demo" /> : null}
          </View>
        </View>
      </Pressable>
      <Pressable
        testID={`fav-${recipe.id}`}
        accessibilityRole="button"
        accessibilityLabel={recipe.favorite ? `Remove ${recipe.name} from favorites` : `Add ${recipe.name} to favorites`}
        accessibilityState={{ selected: recipe.favorite }}
        onPress={() => {
          tapFeedback();
          store.patch('recipes', recipe.id, { favorite: !recipe.favorite });
        }}
        style={styles.fav}>
        <Icon name={recipe.favorite ? 'star' : 'starOutline'} size={22} color={recipe.favorite ? colors.warning : colors.textTertiary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  cardBody: { flex: 1, flexDirection: 'row', gap: spacing.md, padding: spacing.lg },
  thumb: { width: 52, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap', marginTop: 2 },
  fav: { width: MIN_TOUCH, alignItems: 'center', paddingTop: spacing.lg },
});
