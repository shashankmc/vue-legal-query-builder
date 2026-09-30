import { createApp } from 'vue'
import App from './App.vue'
// The package's own styles, exactly as a consumer imports them.
import '../src/styles/shared.css'

createApp(App).mount('#app')
