# Mi Bandeja

App de comedores institucionales. Una sola app para todo el país: el alumno elige
su departamento y su institución al registrarse, y el encargado de esa
institución aprueba o rechaza el registro.

Estado: **Fase 1 — autenticación, roles y multi-institución** implementada.

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

## Puesta en marcha de una institución

Los scripts necesitan `scripts/service-account.json` (Firebase Console →
**Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**).

**1. Dar de alta la institución.**

```bash
node scripts/crear-institucion.js polo-rivera "Polo Educativo Tecnológico" "Rivera" "Rivera" 11:30
```

Los argumentos son: id, nombre, departamento, ciudad y hora de apertura del
comedor. Queda activa, y desde ese momento aparece en la lista de registro de su
departamento. Para ver las que ya existen: `node scripts/crear-institucion.js --listar`.

**2. Registrarse desde la app**, eligiendo esa institución. La cuenta queda en
estado `pendiente`.

**3. Asignar el rol.**

```bash
node scripts/asignar-rol.js tucorreo@ejemplo.com admin polo-rivera
```

**4. Cerrar sesión en la app y volver a entrar**, para que el token traiga el rol.

Los roles `cocinero` y `encargado` se asignan igual. El `superadmin` es el único
que no lleva institución:

```bash
node scripts/asignar-rol.js tucorreo@ejemplo.com superadmin
```

---

## Qué hace la Fase 1

- Registro en tres pasos: departamento, institución y datos personales.
- Solo aparecen las instituciones dadas de alta y activas de ese departamento.
- Cada registro nuevo queda en estado `pendiente` hasta que lo aprueba el
  encargado **de esa institución**.
- Login con sesión persistente entre reinicios de la app.
- Pantalla de administración acotada a la propia institución: aprobar y rechazar.
- Aviso de cédula repetida dentro de la institución antes de aprobar.
- Pantalla de superadmin: catálogo nacional, activar y desactivar instituciones.
- Enrutamiento por rol: cada usuario entra directamente a su pantalla.

## Cómo probar que la Fase 1 quedó bien

**Registro y aprobación**
- [ ] Elegir un departamento sin instituciones muestra el mensaje correspondiente.
- [ ] Un alumno nuevo se registra y cae en la pantalla de espera.
- [ ] Ese registro aparece en la pantalla del admin de su institución.
- [ ] Al aprobarlo, la pantalla del alumno cambia sola, sin reiniciar la app.
- [ ] Al rechazarlo, el alumno ve el mensaje de rechazo.

**Aislamiento entre instituciones**
- [ ] Con dos instituciones dadas de alta y un registro pendiente en cada una,
      cada admin ve únicamente el registro de la suya.

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
- [ ] Un admin intentando leer un usuario de otra institución → **denegado**.
- [ ] Un admin intentando cambiar el `institucionId` de un usuario → **denegado**.
- [ ] Un usuario sin sesión intentando leer `usuarios` → **denegado**.
- [ ] Alguien que no es superadmin intentando escribir en `instituciones` → **denegado**.

La colección `instituciones` es la única que se lee sin sesión, porque la app
necesita mostrar la lista antes de que el alumno tenga cuenta. No contiene datos
personales.

Si alguna de estas pruebas pasa en vez de fallar, hay un agujero de seguridad y
hay que corregirlo antes de seguir.

---

## Estructura del proyecto

```
app/                      pantallas (Expo Router: cada archivo es una ruta)
  _layout.js              guardia de navegación: decide a dónde va cada rol
  index.js                pantalla de arranque
  login.js
  registro/
    _layout.js
    index.js              elegir departamento
    institucion.js        elegir institución
    datos.js              formulario de registro
  pendiente.js            espera de aprobación
  alumno/index.js         (Fase 3)
  cocinero/index.js       (Fase 2)
  encargado/index.js      (Fase 4)
  admin/index.js          aprobación de registros de su institución
  superadmin/index.js     catálogo nacional de instituciones

src/
  firebase.js             inicialización del SDK
  contexts/AuthContext.js sesión, perfil, rol e institución en tiempo real
  components/ui.js        Pantalla, Campo, Boton, Aviso, Opcion, Cargando
  components/Encabezado.js
  validaciones.js         validación de campos y mensajes de error
  departamentos.json      los 19 departamentos
  theme.js                colores, espaciados, tipografía

scripts/
  crear-institucion.js    da de alta una institución
  asignar-rol.js          asigna rol e institución como custom claims

firestore.rules           reglas de seguridad
```

## Detalle sobre los roles

El rol y la institución del personal viven en los **custom claims** de Firebase
Auth, no en Firestore. El campo `rol` que existe en el documento de usuario es
solo una copia informativa para poder mostrarlo en listas: no da ningún permiso.

Como consecuencia, un usuario sin claim asignado se trata como **alumno** por
defecto. Solo el personal recibe un claim explícito, y eso evita tener que correr
el script por cada estudiante que se registre.

El alumno no lleva la institución en el claim: la eligió él al registrarse y vive
en su documento. No hace falta protegerla con un claim porque no le da acceso a
nada por sí sola — la cuenta pasa igual por la aprobación de una persona.

Cuando se le cambia el rol a alguien, **tiene que cerrar sesión y volver a
entrar**: el token con los claims se emite al iniciar sesión.

## Pendiente para más adelante

Cambiar de institución desde "Mi perfil" (vuelve la cuenta a `pendiente` y
resetea tickets y beca) queda para cuando se construya esa pantalla. Hoy las
reglas no permiten mover a un usuario de institución, ni siquiera a un admin.
