// Pantalla de verificación (Fase 0): comprueba que Expo corre en el celular y
// que el SDK de Firebase quedó bien instalado y conectado.
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { app, auth, db } from './src/firebase';

function Fila({ etiqueta, estado, detalle }) {
  const color = estado === 'ok' ? '#137547' : estado === 'error' ? '#b3261e' : '#8a8a8a';
  const icono = estado === 'ok' ? '✓' : estado === 'error' ? '✕' : '•';
  return (
    <View style={styles.fila}>
      <Text style={[styles.icono, { color }]}>{icono}</Text>
      <View style={styles.filaTexto}>
        <Text style={styles.etiqueta}>{etiqueta}</Text>
        {detalle ? <Text style={styles.detalle}>{detalle}</Text> : null}
      </View>
    </View>
  );
}

export default function App() {
  const [almacenamiento, setAlmacenamiento] = useState({ estado: 'pendiente' });
  const [firestore, setFirestore] = useState({ estado: 'pendiente' });
  const [probando, setProbando] = useState(false);

  // AsyncStorage es el módulo nativo del que depende la persistencia de sesión.
  // Si esto funciona, el módulo quedó bien enlazado en Expo Go.
  useEffect(() => {
    (async () => {
      try {
        await AsyncStorage.setItem('mibandeja:prueba', String(Date.now()));
        const valor = await AsyncStorage.getItem('mibandeja:prueba');
        setAlmacenamiento(
          valor ? { estado: 'ok', detalle: 'lectura y escritura correctas' }
                : { estado: 'error', detalle: 'no devolvió el valor guardado' }
        );
      } catch (e) {
        setAlmacenamiento({ estado: 'error', detalle: e.message });
      }
    })();
  }, []);

  // Lee un documento que no existe. Lo que importa no es el contenido sino la
  // respuesta del servidor: cualquier respuesta significa que hay conexión.
  async function probarFirestore() {
    setProbando(true);
    setFirestore({ estado: 'pendiente' });
    try {
      await getDoc(doc(db, 'diagnostico', 'ping'));
      setFirestore({ estado: 'ok', detalle: 'el servidor respondió la consulta' });
    } catch (e) {
      if (e.code === 'permission-denied') {
        // Las reglas rechazaron la lectura, pero para rechazarla tuvo que
        // recibirla: la conexión con Firestore funciona.
        setFirestore({ estado: 'ok', detalle: 'conectado (las reglas bloquean la lectura, es lo esperado)' });
      } else {
        setFirestore({ estado: 'error', detalle: `${e.code || 'error'}: ${e.message}` });
      }
    } finally {
      setProbando(false);
    }
  }

  return (
    <View style={styles.pantalla}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.contenido}>
        <Text style={styles.titulo}>Mi Bandeja</Text>
        <Text style={styles.subtitulo}>Verificación de instalación — Fase 0</Text>

        <View style={styles.tarjeta}>
          <Fila estado="ok" etiqueta="Expo corriendo en el celular" detalle="si ves esta pantalla, Metro y Expo Go están bien" />
          <Fila estado="ok" etiqueta="Firebase inicializado" detalle={`proyecto: ${app.options.projectId}`} />
          <Fila
            estado={auth ? 'ok' : 'error'}
            etiqueta="Authentication listo"
            detalle={auth ? 'persistencia de sesión con AsyncStorage' : 'no se pudo inicializar'}
          />
          <Fila estado={almacenamiento.estado} etiqueta="AsyncStorage" detalle={almacenamiento.detalle} />
          <Fila
            estado={firestore.estado}
            etiqueta="Firestore"
            detalle={firestore.detalle || 'sin probar todavía'}
          />
        </View>

        <Pressable
          style={({ pressed }) => [styles.boton, pressed && styles.botonPresionado]}
          onPress={probarFirestore}
          disabled={probando}
        >
          {probando
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.botonTexto}>Probar conexión con Firestore</Text>}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: '#f6f7f9' },
  contenido: { padding: 24, paddingTop: 72, gap: 16 },
  titulo: { fontSize: 32, fontWeight: '700', color: '#1a1a1a' },
  subtitulo: { fontSize: 15, color: '#6b6b6b', marginTop: -10 },
  tarjeta: { backgroundColor: '#fff', borderRadius: 14, padding: 18, gap: 14 },
  fila: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  icono: { fontSize: 17, fontWeight: '700', width: 18, lineHeight: 22 },
  filaTexto: { flex: 1 },
  etiqueta: { fontSize: 16, color: '#1a1a1a', fontWeight: '600' },
  detalle: { fontSize: 13, color: '#6b6b6b', marginTop: 2 },
  boton: { backgroundColor: '#1f6feb', borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
  botonPresionado: { opacity: 0.75 },
  botonTexto: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
