<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const localePath = useLocalePath()

const isNotFound = computed(() => props.error?.statusCode === 404)
</script>

<template>
  <NuxtLayout>
    <section class="error container-narrow">
      <MascotKancil :mood="isNotFound ? 'thinking' : 'oops'" :size="200" />
      <p class="error__code">{{ error?.statusCode ?? 500 }}</p>
      <h1 class="error__title">
        {{ isNotFound ? $t('error.notFoundTitle') : $t('error.generalTitle') }}
      </h1>
      <p class="error__body">
        {{ isNotFound ? $t('error.notFoundBody') : $t('error.generalBody') }}
      </p>
      <div class="error__actions">
        <BaseButton :to="localePath('index')" variant="primary" size="lg">
          <template #icon-left><BaseIcon name="home" :size="18" /></template>
          {{ $t('error.home') }}
        </BaseButton>
        <BaseButton :to="localePath('latihan')" variant="secondary" size="lg">
          {{ $t('error.practice') }}
        </BaseButton>
      </div>
    </section>
  </NuxtLayout>
</template>

<style scoped lang="scss">
.error {
  display: grid;
  justify-items: center;
  text-align: center;
  gap: 0.5rem;
  padding-block: 3rem 4rem;

  &__code {
    @include eyebrow;
  }

  &__body {
    max-width: 42ch;
  }

  &__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }
}
</style>
