# Mi Bandeja

App del comedor institucional del Polo Educativo Tecnológico de Rivera.
El plan técnico completo está en `mi-bandeja-arquitectura-v1.md`.

## Estado actual — Fase 0 verificada

El proyecto arranca en Expo Go y el SDK de Firebase queda inicializado. Eso es
todo lo que hay hoy: `App.js` es una pantalla de diagnóstico, no la app.

```
App.js            pantalla de verificación (Expo + Firebase + AsyncStorage + Firestore)
index.js          punto de entrada
src/firebase.js   inicialización del SDK de Firebase
app.json          configuración de Expo
assets/           íconos
```

Dependencias instaladas y verificadas contra Expo SDK 57:

| Paquete | Versión |
|---|---|
| expo | 57.0.14 |
| react | 19.2.3 |
| react-native | 0.86.2 |
| expo-status-bar | 57.0.1 |
| @react-native-async-storage/async-storage | 2.2.0 |
| firebase | 12.17.1 |

Para levantarlo:

```bash
npm install
npm start
```

Y escaneás el QR con **Expo Go** en el celular (la computadora y el celular
tienen que estar en la misma red wifi).

> **Instalá siempre con `npx expo install`, nunca con `npm install`**, para
> todo paquete que tenga parte nativa. `npm` baja la última versión publicada;
> `expo install` baja la que corresponde a tu SDK, que es la que Expo Go trae
> compilada adentro. Ejemplo real: `npm` instala async-storage 3.1.1, pero
> Expo Go 57 trae la 2.2.0, y la app crashea al abrir.

---

# Fase 1 — autenticación y roles (pendiente)

Al terminar estos pasos tenés: registro de alumnos, aprobación por parte de un
administrador, login persistente, y cada rol entrando a su propia pantalla.

Nada de lo que sigue está implementado todavía.

---

## Paso 1 — Instalar las dependencias de la fase

```bash
npx expo install expo-router expo-constants expo-linking \
  react-native-safe-area-context react-native-screens \
  expo-camera react-native-svg

npx expo install react-native-qrcode-svg
npm install --save-dev firebase-admin
```

Al pasar a `expo-router` hay que cambiar `"main"` en `package.json` a
`"expo-router/entry"` y mover las pantallas a `app/`.

## Paso 2 — Habilitar el login en Firebase

La configuración del proyecto ya está en `src/firebase.js` (proyecto
`comedor-mi-bandeja`). Falta habilitar el método de acceso:

En **Authentication → Sign-in method**, habilitá **Correo electrónico/contraseña**.

> Sobre la `apiKey`: no es un secreto. Es un identificador público del proyecto y
> va incluida en toda app cliente de Firebase. Lo que protege tus datos son las
> reglas de seguridad, no ocultar esa clave. El archivo que sí es secreto es
> `scripts/service-account.json` — ese nunca se sube a ningún lado.

## Paso 3 — Publicar las reglas de seguridad

Escribir `firestore.rules` según la sección 3 del documento de arquitectura y
pegarlo en **Firestore Database → Reglas → Publicar**.

## Paso 4 — Crear el primer administrador

Hay un problema del huevo y la gallina: para aprobar registros hace falta un
admin, y todavía no existe ninguno. Se resuelve así:

1. Registrate desde la app con tu correo. Vas a quedar en estado `pendiente`.
2. Descargá la cuenta de servicio: **Configuración del proyecto → Cuentas de
   servicio → Generar nueva clave privada**. Guardá el archivo como
   `scripts/service-account.json`.
3. Ejecutá:

```bash
node scripts/asignar-rol.js tucorreo@ejemplo.com admin
```

4. Cerrá sesión en la app y volvé a entrar. Ahora entrás como administrador.

Los roles `cocinero` y `encargado` se asignan con el mismo comando.

---

## Cómo probar que la Fase 1 quedó bien

Andá tachando cada punto. Si alguno falla, no avances a la Fase 2.

**Registro y aprobación**
- [ ] Un alumno nuevo se registra y cae en la pantalla de espera.
- [ ] Ese registro aparece en la pantalla del admin.
- [ ] Al aprobarlo, la pantalla del alumno cambia sola, sin reiniciar la app.
- [ ] Al rechazarlo, el alumno ve el mensaje de rechazo.

**Sesión**
- [ ] Cerrás la app por completo, la abrís de nuevo y seguís con la sesión iniciada.
- [ ] "Cerrar sesión" te devuelve al login.

**Validaciones**
- [ ] Correo mal escrito, cédula corta o contraseñas distintas muestran el error
      correspondiente debajo del campo.
- [ ] Registrarse con un correo ya usado muestra un mensaje claro, no un error crudo.

**Seguridad — esta es la parte importante**

Estas pruebas verifican que las reglas realmente bloquean lo que tienen que
bloquear. Se hacen desde el **simulador de reglas** de Firestore
(Firestore Database → Reglas → Simulador de Play):

- [ ] Un alumno intentando escribir `tickets: 20` en su propio documento → **denegado**.
- [ ] Un alumno intentando escribir `rol: 'admin'` en su propio documento → **denegado**.
- [ ] Un alumno intentando leer el documento de otro alumno → **denegado**.
- [ ] Un alumno intentando aprobar su propio registro (`estado: 'activo'`) → **denegado**.
- [ ] Un usuario sin sesión intentando leer cualquier colección → **denegado**.

Si alguna de estas cinco pasa en vez de fallar, hay un agujero de seguridad y
hay que corregirlo antes de seguir.

---

## Estructura objetivo al terminar la Fase 1

```
app/                      pantallas (Expo Router: cada archivo es una ruta)
  _layout.js              guardia de navegación: decide a dónde va cada rol
  index.js                pantalla de arranque
  login.js
  registro.js
  pendiente.js            espera de aprobación
  alumno/index.js         (Fase 3)
  cocinero/index.js       (Fase 2)
  encargado/index.js      (Fase 4)
  admin/index.js          aprobación de registros — ya funcional

src/
  firebase.js             inicialización del SDK (ya existe)
  contexts/AuthContext.js sesión, perfil y rol en tiempo real
  components/ui.js        Campo, Boton, Aviso, Pantalla
  theme.js                colores, espaciados, tipografía

scripts/
  asignar-rol.js          asigna custom claims con el Admin SDK

firestore.rules           reglas de seguridad
```

---

## Detalle sobre los roles

El rol vive en los **custom claims** de Firebase Auth, no en Firestore. El campo
`rol` que existe en el documento de usuario es solo una copia informativa para
poder mostrarlo en listas — no da ningún permiso.

Como consecuencia, un usuario sin claim asignado se trata como **alumno** por
defecto. Solo el personal recibe un claim explícito. Esto evita tener que correr
el script por cada estudiante que se registre.

Cuando se le cambia el rol a alguien, **tiene que cerrar sesión y volver a
entrar**: el token con los claims se emite al iniciar sesión.
