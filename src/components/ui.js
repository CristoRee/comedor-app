import { forwardRef } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colores, espaciado, radio, tipografia } from '../theme';

export function Pantalla({ children, scroll = true, contentContainerStyle }) {
  const contenido = scroll ? (
    <ScrollView
      contentContainerStyle={[estilos.scroll, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[estilos.scroll, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={estilos.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {contenido}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Titulo({ children }) {
  return <Text style={estilos.titulo}>{children}</Text>;
}

export function Subtitulo({ children }) {
  return <Text style={estilos.subtitulo}>{children}</Text>;
}

export const Campo = forwardRef(function Campo(
  { etiqueta, error, ayuda, ...props },
  ref
) {
  return (
    <View style={estilos.campo}>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <TextInput
        ref={ref}
        style={[estilos.input, error && estilos.inputError]}
        placeholderTextColor={colores.textoSuave}
        {...props}
      />
      {error ? <Text style={estilos.mensajeError}>{error}</Text> : null}
      {!error && ayuda ? <Text style={estilos.ayuda}>{ayuda}</Text> : null}
    </View>
  );
});

export function Boton({ titulo, onPress, cargando, deshabilitado, variante = 'primario' }) {
  const inactivo = cargando || deshabilitado;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactivo}
      style={({ pressed }) => [
        estilos.boton,
        estilos[`boton_${variante}`],
        pressed && estilos.botonPresionado,
        inactivo && estilos.botonInactivo,
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={variante === 'primario' ? '#ffffff' : colores.primario} />
      ) : (
        <Text style={[estilos.botonTexto, estilos[`botonTexto_${variante}`]]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function Aviso({ tipo = 'info', titulo, children }) {
  return (
    <View style={[estilos.aviso, estilos[`aviso_${tipo}`]]}>
      {titulo ? <Text style={[estilos.avisoTitulo, estilos[`avisoTexto_${tipo}`]]}>{titulo}</Text> : null}
      <Text style={[estilos.avisoTexto, estilos[`avisoTexto_${tipo}`]]}>{children}</Text>
    </View>
  );
}

export function Cargando({ texto }) {
  return (
    <View style={estilos.cargando}>
      <ActivityIndicator size="large" color={colores.primario} />
      {texto ? <Text style={estilos.cargandoTexto}>{texto}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  flex: { flex: 1 },
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  scroll: { flexGrow: 1, padding: espaciado.lg, gap: espaciado.md },

  titulo: { fontSize: tipografia.titulo, fontWeight: '700', color: colores.texto },
  subtitulo: { fontSize: tipografia.cuerpo, color: colores.textoSuave, marginTop: -espaciado.sm },

  campo: { gap: espaciado.xs },
  etiqueta: { fontSize: tipografia.nota, fontWeight: '600', color: colores.texto },
  input: {
    backgroundColor: colores.superficie,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.md,
    paddingHorizontal: espaciado.md,
    paddingVertical: espaciado.sm + 4,
    fontSize: tipografia.cuerpo,
    color: colores.texto,
  },
  inputError: { borderColor: colores.error },
  mensajeError: { fontSize: tipografia.nota, color: colores.error },
  ayuda: { fontSize: tipografia.nota, color: colores.textoSuave },

  boton: {
    borderRadius: radio.md,
    paddingVertical: espaciado.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  boton_primario: { backgroundColor: colores.primario },
  boton_secundario: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colores.borde },
  boton_peligro: { backgroundColor: colores.error },
  botonPresionado: { opacity: 0.75 },
  botonInactivo: { opacity: 0.55 },
  botonTexto: { fontSize: tipografia.cuerpo, fontWeight: '600' },
  botonTexto_primario: { color: '#ffffff' },
  botonTexto_secundario: { color: colores.texto },
  botonTexto_peligro: { color: '#ffffff' },

  aviso: { borderRadius: radio.md, padding: espaciado.md, gap: espaciado.xs },
  aviso_info: { backgroundColor: '#e8f0fe' },
  aviso_error: { backgroundColor: '#fde8e6' },
  aviso_exito: { backgroundColor: '#e3f3e9' },
  aviso_advertencia: { backgroundColor: '#fdf1dd' },
  avisoTitulo: { fontSize: tipografia.cuerpo, fontWeight: '700' },
  avisoTexto: { fontSize: tipografia.nota + 1, lineHeight: 20 },
  avisoTexto_info: { color: '#0b3d91' },
  avisoTexto_error: { color: colores.error },
  avisoTexto_exito: { color: colores.exito },
  avisoTexto_advertencia: { color: colores.advertencia },

  cargando: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: espaciado.md },
  cargandoTexto: { fontSize: tipografia.nota + 1, color: colores.textoSuave },
});
