<template>
  <div id="app">
    <ProtocolDisplay />
  </div>
</template>

<script>
import ProtocolDisplay from './components/ProtocolDisplay.vue'

export default {
  name: 'App',
  components: {
    ProtocolDisplay
  }
}
</script>

<style>
#app {
  height: 100%;
}
</style>