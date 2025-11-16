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
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}
</style>