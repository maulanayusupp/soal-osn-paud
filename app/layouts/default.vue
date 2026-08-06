<template>
  <div class="app">
    <a class="skip-link" href="#main">{{ $t('nav.skipToContent') }}</a>
    <AppHeader />
    <main id="main" class="app-main">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>

<style scoped lang="scss">
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-height: 100dvh;
}

.app-main {
  flex: 1;
}
</style>
