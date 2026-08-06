<script setup lang="ts">
/**
 * Contact is a mailto form, not a server endpoint.
 *
 * There is no backend, no database and no third-party form service — so nothing
 * a visitor types here is stored or transmitted anywhere except into their own
 * mail client. Saying that plainly is better than a fake "message sent" toast.
 */
const { t } = useI18n()
const email = useRuntimeConfig().public.contactEmail as string

const topics = ['question', 'correction', 'takedown', 'other'] as const
type Topic = (typeof topics)[number]

const form = reactive({ name: '', topic: 'question' as Topic, message: '' })

const mailto = computed(() => {
  const subject = t(`contact.topics.${form.topic}`)
  const body = [
    form.message.trim(),
    '',
    form.name.trim() ? `— ${form.name.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')
  return `mailto:${email}?subject=${encodeURIComponent(`[${subject}]`)}&body=${encodeURIComponent(body)}`
})

const canSend = computed(() => form.message.trim().length > 3)

usePageSeo(
  () => t('contact.seo.title'),
  () => t('contact.seo.description'),
)
</script>

<template>
  <div>
    <PageHero
      :eyebrow="$t('contact.hero.eyebrow')"
      :title="$t('contact.hero.title')"
      :lead="$t('contact.hero.lead')"
    />

    <section class="container-narrow contact">
      <BaseCard class="contact__card">
        <form class="contact__form" @submit.prevent>
          <label class="field">
            <span class="field__label">{{ $t('contact.form.name') }}</span>
            <input v-model="form.name" class="field__input" type="text" autocomplete="name" />
          </label>

          <label class="field">
            <span class="field__label">{{ $t('contact.form.topic') }}</span>
            <select v-model="form.topic" class="field__input">
              <option v-for="topic in topics" :key="topic" :value="topic">
                {{ $t(`contact.topics.${topic}`) }}
              </option>
            </select>
          </label>

          <label class="field">
            <span class="field__label">{{ $t('contact.form.message') }}</span>
            <textarea v-model="form.message" class="field__input" rows="6" required />
          </label>

          <BaseButton :href="canSend ? mailto : undefined" :disabled="!canSend" variant="primary" size="lg">
            <template #icon-left><BaseIcon name="mail" :size="18" /></template>
            {{ $t('contact.form.send') }}
          </BaseButton>

          <p class="contact__hint">{{ $t('contact.form.hint') }}</p>
        </form>
      </BaseCard>

      <aside class="contact__side">
        <h2 class="contact__sideTitle">{{ $t('contact.direct.title') }}</h2>
        <a class="contact__email" :href="`mailto:${email}`">
          <BaseIcon name="mail" :size="18" />
          {{ email }}
        </a>
        <p class="contact__note">{{ $t('contact.direct.body') }}</p>

        <InfoNote class="contact__privacy">
          <p>{{ $t('contact.privacyNote') }}</p>
        </InfoNote>
      </aside>
    </section>
  </div>
</template>

<style scoped lang="scss">
.contact {
  display: grid;
  gap: 1.5rem;
  padding-bottom: 3rem;

  @include respond-to('lg') {
    grid-template-columns: 1.4fr 1fr;
    align-items: start;
  }

  &__form {
    display: grid;
    gap: 1rem;
    justify-items: start;
  }

  &__hint {
    font-size: 0.85rem;
  }

  &__side {
    display: grid;
    gap: 0.7rem;
    padding: 1.5rem;
    @include paper-quiet;
  }

  &__sideTitle {
    font-size: 1.15rem;
  }

  &__email {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    text-decoration: none;
    word-break: break-all;
  }

  &__note,
  &__privacy {
    font-size: 0.9rem;
  }
}

.field {
  display: grid;
  gap: 0.35rem;
  width: 100%;

  &__label {
    @include eyebrow;
  }

  &__input {
    width: 100%;
    padding: 0.7rem 0.9rem;
    border: 2px solid var(--c-ink-line-soft);
    border-radius: $radius-md;
    background: var(--c-surface);
    font-family: var(--font-body);
    transition: border-color $duration-fast $ease-out;

    &:focus {
      border-color: var(--c-leaf);
    }
  }

  textarea.field__input {
    resize: vertical;
    min-height: 8rem;
  }
}
</style>
