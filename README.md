# A Fistful of Darkness — Sistema para Foundry VTT

Sistema no oficial para **A Fistful of Darkness** (AFoD) en [Foundry Virtual Tabletop](https://foundryvtt.com/) v13.

AFoD es un hack de *Blades in the Dark* ambientado en el **Weird West**: pistoleros, monstruos, Hellstone que corrompe la tierra y cuatro Jinetes del Apocalipsis esperando su momento. Las partidas giran en torno a una Posse de forajidos que realiza Runs (incursiones) mientras el Doom del mundo aumenta irremediablemente.

> **Nota:** Este sistema requiere el juego original *A Fistful of Darkness* de Stefan Struck. El sistema de Foundry no incluye el texto de las reglas con excepción del compendio de referencia integrado.

---

<img width="1917" height="1079" alt="image" src="https://github.com/user-attachments/assets/8c7f6b9d-53f0-41b7-b01d-3fe9585b9008" />


---

## Características

- **Fichas de personaje** para todos los Playbooks (The Fist, The Shot, The Sneak, The Hex, The Weird, The Brute, The Con, The Feral, The Ghost, The Loner, The Warden y el Revenant)
- **Ficha de Posse** con gestión de Tier, Hold, REP, Doom Tracker, logros y contactos
- **Fichas de Facción, Localización y NPC** para el DJ
- **Fichas de Reloj** públicas o privadas, con soporte para grupos de jugadores
- **Sistema de tiradas** integrado: Tirada de Acción, Resistencia y Fortuna, con diálogo configurable
- **Moneda dual**: Coin y Hellstone gestionados de forma independiente
- **Compendios** con Libretos, Habilidades, Objetos, Vicios, Herencias, Tipos de Cuadrilla, Facciones, Tablas de Tirada y Guía del Sistema
- **Bilingüe ES / CA**: toda la interfaz y el compendio de reglas en español y catalán
- **Tablas de Tirada** generadoras de encuentros, mutaciones, personas, localizaciones, vicios y más

---

## Instalación

### Desde Foundry (recomendado)

1. En Foundry, ve a **Setup → Game Systems → Install System**
2. Pega la URL del manifiesto en el campo de búsqueda:
   ```
   https://raw.githubusercontent.com/Ellyjah/a-fistful-of-darkness/main/system.json
   ```
3. Haz clic en **Install**

### Manual

Descarga el zip de la [última release](https://github.com/Ellyjah/a-fistful-of-darkness/releases/latest) y descomprímelo en la carpeta `Data/systems/` de tu instalación de Foundry.

---

## Fichas de personaje

### Personaje (PC)

<img width="1024" height="906" alt="image" src="https://github.com/user-attachments/assets/eb745393-3c2a-49c2-9048-49223643cb75" />


La ficha de personaje incluye:

- **Atributos y Acciones** — los 3 atributos (Wits, Prowess, Guts) con sus 12 acciones, con puntos marcables
- **Grit** — barra de resistencia (máx. 9), con botón de tirada de resistencia directamente desde la ficha
- **Estigmas** — contador de traumas (máx. 4) con los 10 Stigmata disponibles
- **Inventario** — objetos, armas y artefactos arrastrables desde los compendios
- **Habilidades especiales** — del Playbook seleccionado
- **Vicios e Indulgencia**
- **Notas** de personaje y contactos

### Posse (Cuadrilla)

<img width="1024" height="979" alt="image" src="https://github.com/user-attachments/assets/dbfbfe4f-d534-4a19-9220-cbb7a6ffcd47" />


- **Tier y Hold** con display visual
- **REP y Coin / Hellstone** — gestión de recursos con conversión entre monedas
- **Doom Tracker** (0–10) integrado en la ficha
- **Logros** (Achievements) tipo Light, Dark y Neutral
- **Upgrades y Claims** de la Cuadrilla
- **Contactos** con lista predefinida por tipo de Cuadrilla

---

## Sistema de tiradas

<img width="331" height="509" alt="image" src="https://github.com/user-attachments/assets/721febc2-93b0-4e0f-a89d-c516f61f0354" />


Las tiradas se lanzan desde la ficha o desde el botón **Dado** en la barra de controles. El diálogo permite configurar:

- **Acción** base y dados adicionales (asistencia, push, devil's bargain)
- **Posición** (Controlled / Risky / Desperate) y **Efecto** (Great / Standard / Limited)
- **Modo cero dados**: cuando el pool es negativo, tira 2d6 y coge el peor

Los resultados se publican en el chat con el desglose completo: resultado, posición y consecuencias sugeridas.

### Tipos de tirada disponibles

| Tirada | Cómo activarla |
|--------|---------------|
| Tirada de Acción | Clic en cualquier acción de la ficha |
| Resistencia | Botón en la barra de Grit o en el chat tras una consecuencia |
| Fortuna | Botón de dado libre en la barra de controles |
| Tirada de Grupo | Desde la ficha de Posse o arrastrando actores al grupo |

---

## Relojes

<img width="452" height="691" alt="image" src="https://github.com/user-attachments/assets/1fda3841-ce18-4b1a-80e6-1549b46eaaa2" />


Los relojes son Actores de tipo especial que pueden colocarse en el canvas. Soportan tamaños de 4, 6, 8, 10 y 12 segmentos. Pueden configurarse como **públicos** (visibles para todos los jugadores) o privados.

---

## Compendios

El sistema incluye los siguientes compendios:

| Compendio | Contenido |
|-----------|-----------|
| **Libretos** | Los 12 Playbooks con habilidades especiales |
| **Tipos de Cuadrilla** | Los 4 tipos de Posse con upgrades y contactos |
| **Habilidades** | Todas las habilidades especiales de Playbook |
| **Habilidades de Cuadrilla** | Habilidades y upgrades de Posse |
| **Objetos Estándar** | Armas, equipo y artefactos |
| **Vicios** | Los 7 tipos de Vicio |
| **Herencias** | Las 6 opciones de Heritage |
| **Facciones** | Todas las facciones de Mudwater con sus relojes |
| **Tablas de Tirada** | Generadores aleatorios para el DJ |
| **Guía del Sistema** | Reglas completas de referencia (bilingüe ES/CA) |

### Guía del Sistema

<img width="1670" height="905" alt="image" src="https://github.com/user-attachments/assets/bbca9efc-713d-409e-b257-7c75d294dbae" />


El compendio **Guía del Sistema** incluye dos journals de referencia con todas las reglas:

**Reglas Base del Sistema**
- Tirada de Acción paso a paso
- Tabla de Posición × Efecto con resultados
- Relojes y cómo usarlos
- Resistencia y consecuencias
- Trabajo en equipo, Fortuna y Flashbacks

**A Fistful of Darkness — El Sistema**
- Ciclo de juego: Run → Payoff → Downtime
- Perdición (Doom) y los Cuatro Jinetes
- Aguante (Grit), Daño y Estigmas
- Moneda dual: Coin y Hellstone
- Mutaciones, Reparto y Descanso
- Misiones Subterráneas (Underworld Runs)
- Logros, Indulgencia y Final de Partida

---

## Localización

El sistema está disponible en **español**, **catalán** e **inglés** (interfaz básica). Cambia el idioma en *Foundry → Configure Settings → Core Settings → Language*.

Cuando el idioma es catalán, el contenido de los journals del compendio cambia automáticamente sin necesidad de recargar.

---

## Compatibilidad

| Foundry VTT | Estado |
|-------------|--------|
| v13 (13.351+) | ✅ Verificado |
| v12 | ⚠️ No probado |
| v11 o anterior | ❌ No compatible |

---

## Créditos

- **John Harper** — *Blades in the Dark* (juego original)
- **Stefan Struck** — *A Fistful of Darkness* (hack original)
- **Dez384** — sistema Foundry VTT de *Blades in the Dark* (base de código)
- **Ellyjah** — implementación de este sistema para Foundry VTT
