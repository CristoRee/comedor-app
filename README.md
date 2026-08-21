# Mi Bandeja

App del comedor institucional del Polo Educativo Tecnológico de Rivera.
El plan técnico completo está en `mi-bandeja-arquitectura-v1.md`.

Estado: **Fase 1 — autenticación y roles** implementada.

---

## Levantar el proyecto

```bash
npm install
npm start
```

Escaneá el QR con **Expo Go**. La computadora y el celular tienen que estar en la
misma red wifi.

> Los paquetes con parte nativa se instalan con `npx expo install`, nunca con
> `npm install`: `npm` baja la última versión publicada y Expo Go trae compilada
> la que corresponde a la SDK. Una diferencia de versión ahí hace que la app
> falle recién al abrirse en el celular.

## Configuración de Firebase

Proyecto `comedor-mi-bandeja`. La configuración del cliente está en
`src/firebase.js`.

1. **Authentication → Sign-in method**: habilitar *Correo electrónico/contraseña*.
2. **Firestore Database → Reglas**: pegar el contenido de `firestore.rules` y publicar.

> La `apiKey` no es un secreto: es un identificador público del proyecto y va
> incluida en toda app cliente de Firebase. Lo que protege los datos son las
> reglas de seguridad. El archivo que sí es secreto es
> `scripts/service-account.json`, que está en el `.gitignore` y no se sube nunca.

## Crear el primer administrador

Para aprobar registros hace falta un administrador, y al principio no existe
ninguno. Se resuelve así:

1. Registrarse desde la app. La cuenta queda en estado `pendiente`.
2. **Configuración del proyecto → Cuentas de servicio → Generar nueva clave
   privada**. Guardar el archivo como `scripts/service-account.json`.
3. Ejecutar:

```bash
node scripts/asignar-rol.js tucorreo@ejemplo.com admin
```

4. Cerrar sesión en la app y volver a entrar.

Los roles `cocinero` y `encargado` se asignan con el mismo comando.

---

## Qué hace la Fase 1

- Registro de alumnos con validación de todos los campos.
- Cada registro nuevo queda en estado `pendiente` hasta que un administrador lo aprueba.
- Login con sesión persistente entre reinicios de la app.
- Pantalla de administración con los registros pendientes, aprobar y rechazar.
- Aviso de cédula repetida antes de aprobar.
- Enrutamiento por rol: cada usuario entra directamente a su pantalla.

## Cómo probar que la Fase 1 quedó bien

**Registro y aprobación**
- [ ] Un alumno nuevo se registra y cae en la pantalla de espera.
- [ ] Ese registro aparece en la pantalla del admin.
- [ ] Al aprobarlo, la pantalla del alumno cambia sola, sin reiniciar la app.
- [ ] Al rechazarlo, el alumno ve el mensaje de rechazo.

**Sesión**
- [ ] Cerrar la app por completo, abrirla de nuevo y seguir con la sesión iniciada.
- [ ] "Cerrar sesión" devuelve al login.

**Validaciones**
- [ ] Correo mal escrito, cédula corta o contraseñas distintas muestran el error
      debajo del campo correspondiente.
- [ ] Registrarse con un correo ya usado muestra un mensaje claro, no un error crudo.

**Seguridad**

Estas pruebas verifican que las reglas bloquean lo que tienen que bloquear. Se
hacen desde el simulador de reglas de Firestore
(Firestore Database → Reglas → Simulador de Play):

- [ ] Un alumno intentando escribir `tickets: 20` en su propio documento → **denegado**.
- [ ] Un alumno intentando escribir `rol: 'admin'` en su propio documento → **denegado**.
- [ ] Un alumno intentando leer el documento de otro alumno → **denegado**.
- [ ] Un alumno intentando aprobar su propio registro (`estado: 'activo'`) → **denegado**.
- [ ] Un usuario sin sesión intentando leer cualquier colección → **denegado**.

Si alguna de estas cinco pasa en vez de fallar, hay un agujero de seguridad y hay
que corregirlo antes de seguir.

---

## Estructura del proyecto

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
  admin/index.js          aprobación de registros

src/
  firebase.js             inicialización del SDK
  contexts/AuthContext.js sesión, perfil y rol en tiempo real
  components/ui.js        Pantalla, Campo, Boton, Aviso, Cargando
  components/Encabezado.js
  validaciones.js         validación de campos y mensajes de error
  theme.js                colores, espaciados, tipografía

scripts/
  asignar-rol.js          asigna custom claims con el Admin SDK

firestore.rules           reglas de seguridad
```

## Detalle sobre los roles

El rol vive en los **custom claims** de Firebase Auth, no en Firestore. El campo
`rol` que existe en el documento de usuario es solo una copia informativa para
poder mostrarlo en listas: no da ningún permiso.

Como consecuencia, un usuario sin claim asignado se trata como **alumno** por
defecto. Solo el personal recibe un claim explícito, y eso evita tener que correr
el script por cada estudiante que se registre.

Cuando se le cambia el rol a alguien, **tiene que cerrar sesión y volver a
entrar**: el token con los claims se emite al iniciar sesión.
