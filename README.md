# Mi Bandeja

App de comedores institucionales. Una sola app para todo el país: el alumno elige
su departamento y su institución al registrarse, y el encargado de esa
institución aprueba o rechaza el registro.

Estado: **loop central completo**. Menú del día, confirmación de asistencia,
código QR, escaneo en la puerta, descuento de tickets y pantalla de contadores.

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

---

## Agregar una institución nueva

Es un comando. No hay que compilar ni publicar nada: la institución aparece en la
lista de registro de su departamento en cuanto se crea.

```bash
node scripts/crear-institucion.js <id> "<nombre>" "<departamento>" "<ciudad>" <hh:mm>
```

- **id**: corto, en minúsculas y sin espacios (`polo-rivera`, `utu-salto`). Es el
  que se usa después para asignarle el personal, y no se puede cambiar.
- **departamento**: exacto, uno de los 19. El script rechaza cualquier otro.
- **hh:mm**: hora a la que abre el comedor.

Para ver las que ya existen:

```bash
node scripts/crear-institucion.js --listar
```

Para desactivar una sin borrarla, entrás a la app como `superadmin`: deja de
aparecer en el registro, pero las cuentas ya aprobadas siguen funcionando.

### Configuración operativa

El script crea también la configuración completa, con los valores del Polo como
punto de partida:

```
instituciones/{institucionId}
  nombre, departamento, ciudad, activa, creadaEn

  horarios: {
    horaAperturaComedor       // el argumento del script
    horaLimiteMenu: "08:00"   // hasta qué hora se puede ajustar el menú
    finDesayuno:    "08:00"   // el contador "van a desayunar" desaparece acá
    finAlmuerzo:    "13:00"   // el contador central pasa a "van a merendar"
    finMerienda:    "18:00"   // pasa a "van a cenar"
    finCena:        "23:00"   // vuelve a "van a almorzar"
  }

  edadCorteChicoGrande: 15
  subroles:   { internado: { activo: true, comidasHabilitadas: [...] } }
  contadores: { mostrarDesayuno: true, mostrarChicoGrande: true }
```

Ningún horario ni umbral está fijado en el código: todo se lee de acá. Una
institución que no usa internado pone `subroles.internado.activo: false` y esa
opción no le aparece a nadie de esa institución.

Mientras no exista la pantalla de "Configuración de mi institución", estos
valores se ajustan a mano desde la consola de Firebase.

---

## Puesta en marcha del Polo Educativo Tecnológico

Los scripts necesitan `scripts/service-account.json` (Firebase Console →
**Configuración del proyecto → Cuentas de servicio → Generar nueva clave privada**).

**1. Dar de alta la institución.**

```bash
node scripts/crear-institucion.js polo-rivera "Polo Educativo Tecnológico" "Rivera" "Rivera" 11:30
```

**2. Registrarse desde la app**, eligiendo Rivera y después el Polo. La cuenta
queda en estado `pendiente`.

**3. Asignar los roles.** Cada persona se registra primero desde la app y después
recibe su rol:

```bash
node scripts/asignar-rol.js jefa@ejemplo.com      admin      polo-rivera
node scripts/asignar-rol.js cocina@ejemplo.com    cocinero   polo-rivera
node scripts/asignar-rol.js portera@ejemplo.com   encargado  polo-rivera
node scripts/asignar-rol.js cristopher@ejemplo.com superadmin
```

**4. Cada uno cierra sesión y vuelve a entrar**, para que el token traiga el rol.

---

## Cómo funciona el día a día

**Cocinero** — carga el menú de hoy o de mañana: plato principal, complementos y
postre, cada uno con sus ingredientes. Los ingredientes se muestran al alumno por
las alergias. Al publicarlo, aparece al instante en la app de los alumnos.

**Alumno** — ve el menú, toca "¡Voy a comer!" y le aparece el código QR. Puede
cancelar hasta que suba. Si es del internado, marca a qué comidas del día va a
subir. El QR se regenera en cada confirmación, así que una captura de pantalla
vieja no sirve.

**Encargado** — abre el escáner y apunta al celular del alumno. En verde con el
nombre si puede pasar; en rojo con el motivo si no: sin tickets, beca vencida,
código de otro día, ya subió hoy. El resultado queda en pantalla hasta que lo
toca, para que no se le escape. Si el alumno se quedó sin batería, lo busca por
cédula y lo marca igual.

**Admin** — aprueba los registros nuevos, y en el listado de alumnos cobra
tickets, cuponeras y mensualidades, asigna becas y marca quién es del internado.
Cada cobro queda registrado en `pagos`, que no se puede editar ni borrar.

**Pantalla del comedor** — los contadores en vivo: van a almorzar, ya subieron,
faltan subir, y cuántos de los que faltan son chicos y cuántos grandes. El
contador central cambia solo de nombre durante el día según los horarios de la
institución.

## Cobros, precios y permisos

**Los precios viven en la institución, no en el código.** El admin (o el
superadmin) los carga una vez desde **Pagos → Ajustar precios**: ticket suelto,
cuponera y mensualidad del internado. En la ficha del alumno, cada botón de
cobro muestra el precio ya calculado, y la media beca aplica la mitad sola sobre
tickets y cuponeras. La mensualidad del internado no lleva descuento.

Un concepto sin precio cargado deja su botón deshabilitado: no se puede cobrar
a ciegas.

Cada cobro queda en `pagos`, que **no se puede editar ni borrar nunca**. Se
guarda también el precio de lista del momento, así el historial sigue siendo
legible aunque después cambien los precios.

**El superadmin decide qué puede hacer el admin de cada institución.** Desde
`/superadmin` se entra a cada institución y se activan o desactivan:

| Permiso | Qué habilita |
|---|---|
| Ajustar precios | El admin puede cambiar los precios de su institución. |
| Ver el registro de pagos | El admin ve el historial de cobros. |
| Ver la pantalla del comedor | El admin ve los contadores del día. |

Vienen los tres activados. Al desactivar uno, la opción desaparece de la vista
del admin.

> Los dos primeros están **verificados en las reglas de seguridad**, no solo
> escondidos en la interfaz: con "Ajustar precios" apagado, el servidor rechaza
> la escritura aunque la petición se mande a mano. "Ver la pantalla del comedor"
> es solo de interfaz — es una preferencia de vista, y comprobarlo en el
> servidor costaría una lectura extra en cada refresco de los contadores.

## Cómo se decide si un alumno puede comer

En este orden: **internado con mensualidad al día → beca completa vigente →
tickets disponibles**. La media beca no da acceso por sí sola: solo hace que se
le cobre la mitad, y eso queda anotado en el pago.

El descuento del ticket ocurre en una transacción atómica junto con la marca de
presente. No hay forma de que se descuente un ticket sin quedar registrada la
entrada, ni al revés.

---

## Generar el APK para instalar en los celulares

```bash
npm install --global eas-cli
eas login
eas build -p android --profile piloto
```

Devuelve un link de descarga del APK. Se instala directo en los celulares, sin
pasar por Play Store. Para el piloto no conviene publicar en Play Store: cuesta
USD 25, la revisión demora, y para una prueba en una sola institución no aporta
nada.

---

## Cómo probar que quedó bien

**El loop central**
- [ ] El cocinero publica el menú y el alumno lo ve sin reiniciar la app.
- [ ] El alumno toca "Voy a comer" y le aparece el QR.
- [ ] El contador "van a almorzar" sube al confirmar y baja al cancelar.
- [ ] El encargado escanea y sale en verde con el nombre del alumno.
- [ ] "Ya subieron" sube y "faltan subir" baja.
- [ ] Al alumno se le descontó un ticket.
- [ ] Escanear el mismo código otra vez avisa que ya subió, con la hora.

**Los casos borde del escáner**
- [ ] Alumno sin tickets → rojo, "Sin tickets disponibles".
- [ ] Alumno que no marcó hoy → rojo, "El alumno no marcó para comer hoy".
- [ ] Alumno que canceló → rojo.
- [ ] Alumno que confirmó, canceló y volvió a confirmar: el QR viejo no sirve.
- [ ] Buscar por cédula marca la entrada y descuenta igual que el escaneo.

**Registro y aprobación**
- [ ] Elegir un departamento sin instituciones muestra el mensaje correspondiente.
- [ ] Un alumno nuevo se registra y cae en la pantalla de espera.
- [ ] Al aprobarlo, la pantalla del alumno cambia sola.

**Aislamiento entre instituciones**
- [ ] Con dos instituciones, cada admin ve solo los registros de la suya.

**Seguridad**

Desde el simulador de reglas de Firestore (Firestore Database → Reglas →
Simulador de Play):

- [ ] Un alumno escribiendo `tickets: 20` en su propio documento → **denegado**.
- [ ] Un alumno escribiendo `rol: 'admin'` en su propio documento → **denegado**.
- [ ] Un alumno poniéndose `estado: 'presente'` en su asistencia → **denegado**.
- [ ] Un alumno leyendo el documento de otro alumno → **denegado**.
- [ ] Un alumno modificando la asistencia de otro → **denegado**.
- [ ] Un encargado cambiando `tickets` a un número cualquiera → **denegado**
      (solo puede restar de a uno).
- [ ] Un admin leyendo un usuario de otra institución → **denegado**.
- [ ] Un admin cambiando `activa` o `nombre` de su institución → **denegado**.
- [ ] Editar o borrar un documento de `pagos` → **denegado** siempre.
- [ ] Un admin cambiando precios con el permiso desactivado → **denegado**.
- [ ] Un admin cambiando `permisosDelAdmin` → **denegado**.
- [ ] Un alumno poniéndose `rol: 'admin'` en su propio documento → **denegado**.
- [ ] Un admin cambiando el `rol` de cualquiera → **denegado**.
- [ ] Un admin ascendiéndose a `superadmin` → **denegado**.
- [ ] Un alumno cambiando algo que no sea su `fotoPerfil` → **denegado**.
- [ ] Un usuario sin sesión leyendo `usuarios` → **denegado**.

`instituciones` es la única colección que se lee sin sesión, porque la app
necesita mostrar la lista antes de que el alumno tenga cuenta. No contiene datos
personales.

---

## Estructura del proyecto

```
app/
  _layout.js              guardia de navegación: decide a dónde va cada rol
  login.js
  registro/               departamento → institución → datos
  pendiente.js            espera de aprobación
  alumno/index.js         menú del día, "Voy a comer" y código QR
  cocinero/index.js       carga del menú
  encargado/index.js      escáner de QR
  encargado/manual.js     búsqueda por cédula
  admin/index.js          aprobación de registros
  alumnos/index.js        listado de alumnos
  alumnos/[id].js         cobros, becas e internado
  pagos/index.js          registro de pagos y ajuste de precios
  comedor.js              pantalla de contadores
  perfil.js               datos, foto y apariencia (todos los roles)
  superadmin/index.js     catálogo nacional de instituciones
  superadmin/nueva.js     alta de una institución
  superadmin/[id]/index.js     permisos y precios
  superadmin/[id]/usuarios.js  usuarios de esa institución
  superadmin/[id]/usuario.js   alta y edición de un usuario

src/
  firebase.js             inicialización del SDK
  contexts/AuthContext.js sesión, perfil, rol e institución en tiempo real
  components/             Pantalla, Campo, Boton, Aviso, Encabezado, Navegación
  acceso.js               con qué derecho come cada alumno
  comedor.js              ids de documentos y rotación del contador
  fechas.js               fechas, horas y edades
  validaciones.js         validación de campos y mensajes de error
  departamentos.json      los 19 departamentos
  theme.js

scripts/
  crear-institucion.js    da de alta una institución
  actualizar-instituciones.js  completa las instituciones ya creadas con campos nuevos
  asignar-rol.js          asigna rol e institución
  limpiar-cuentas.js      borra cuentas de Auth que ya no tienen ficha

firestore.rules           reglas de seguridad
eas.json                  perfil de build del APK del piloto
```

## Detalle sobre los roles

Hay dos niveles, a propósito:

- **`superadmin`** vive en un *custom claim* del token de Firebase Auth. Un claim
  solo se puede escribir con el Admin SDK, desde una máquina con
  `service-account.json`. Nadie se lo puede dar a sí mismo desde la app, pase lo
  que pase. Es el rol que reparte todos los demás, así que es el que más
  protegido tiene que estar.
- **`alumno`, `cocinero`, `encargado`, `admin`** viven en el campo `rol` del
  documento del usuario, y **solo el superadmin los puede cambiar** — está
  verificado en las reglas, no en la interfaz. Eso permite repartir roles desde
  la app, sin scripts.

Un rol solo vale si además la cuenta está en estado `activo`: suspender a
alguien le saca los permisos en el acto.

**Un cambio de rol se aplica al instante**, sin cerrar sesión. La única
excepción es `superadmin`, porque el claim se emite al iniciar sesión.

El primer superadmin se crea con el script:

```bash
node scripts/asignar-rol.js tucorreo@ejemplo.com superadmin
```

## Lo que puede hacer el superadmin desde la app

- **Registrar una institución nueva**: elige departamento, nombre, ciudad, hora
  de apertura e identificador. Queda activa y recibiendo registros al instante.
- **Configurar cada institución**: permisos del admin, precios, activarla o
  desactivarla.
- **Administrar los usuarios de cada institución**: crear, editar, asignar rol y
  estado, y eliminar.

Crear un usuario desde el panel no cierra la sesión de quien lo crea: la cuenta
se da de alta con una instancia secundaria de Firebase, descartable.

> **Al eliminar un usuario se borra su ficha, no su cuenta de correo.** El SDK
> del celular solo puede borrar la cuenta de quien está logueado. La ficha es lo
> que da acceso, así que la persona queda afuera igual, pero el correo sigue
> ocupado. Para liberarlo:
>
> ```bash
> node scripts/limpiar-cuentas.js            # lista lo que borraría
> node scripts/limpiar-cuentas.js --borrar   # borra
> ```

## Mi perfil y modo oscuro

El avatar de arriba a la derecha abre un menú con **Mi perfil** y **Cerrar
sesión**, en todos los roles. Dentro de Mi perfil cada persona ve sus datos,
cambia su foto y elige la apariencia: claro, oscuro o como el celular.

Los datos personales son de solo lectura: fueron verificados al aprobar el
registro, así que los edita la administración. Lo único que cada uno se puede
cambiar a sí mismo es la foto — también verificado en las reglas.

La foto se guarda **dentro del documento del usuario**, achicada a 256 px y
comprimida, porque Firebase Storage exige plan de pago y el piloto corre en el
gratuito. El modo oscuro se guarda en el celular, no en la cuenta.

## Limitaciones conocidas del piloto

- **El escáner necesita conexión.** La validación es una transacción atómica
  contra el servidor, y eso no funciona sin señal. Si el comedor se queda sin
  wifi, la salida es la búsqueda por cédula cuando vuelva, o anotar en papel. La
  cola local de escaneos diferidos queda para después de medir cuántas veces
  pasa de verdad.
- **El menú no tiene fotos.** Firebase Storage exige plan de pago, y el piloto
  corre en el plan gratuito. El menú va con nombre e ingredientes, que es lo que
  importa para las alergias.
- **No hay menú de reserva.** Cargar dos menús posibles y confirmar cuál se hace
  antes de las 8:00 quedó fuera del piloto a propósito.
- **Cambiar de institución** desde "Mi perfil" todavía no existe. Las reglas no
  permiten mover a un usuario de institución, ni siquiera a un admin.
- **`fechaNacimiento` ya se guarda en cada asistencia**, así que si mañana se
  cambia el corte de 15 a 16 años, los contadores se reclasifican solos sin
  tocar el historial.
