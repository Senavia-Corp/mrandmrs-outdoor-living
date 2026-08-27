import { defineCliConfig } from 'sanity/cli'

// El deploy del Studio hospedado lo tiene que correr el dueño del proyecto
// (cuenta mrandmrsoutdoorliving@gmail.com): el login del CLI de esta máquina no llega a m273z6jc.
export default defineCliConfig({
  api: { projectId: 'm273z6jc', dataset: 'production' },
})
