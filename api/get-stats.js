// Importa las librerías necesarias
const { createClient } = require('@supabase/supabase-js');

// Esta es la función principal que Vercel ejecutará
module.exports = async (req, res) => {
    // Solo permitir peticiones GET
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // Configurar cliente de Supabase de forma segura
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        // Obtener solo las columnas necesarias de Supabase
        const { data, error } = await supabase
            .from('encuesta')
            .select('edad, agendo_cita');

        if (error) {
            throw error;
        }

        // --- Procesamiento de Datos ---

        const totalSurveys = data.length;
        const appointmentsScheduled = data.filter(survey => survey.agendo_cita === 'Si').length;

        // Definir los grupos de edad
        const ageGroups = {
            'Menor de 18': 0,
            '18-30': 0,
            '31-45': 0,
            '46-60': 0,
            'Mayor de 60': 0,
            'No especificado': 0,
        };

        // Clasificar cada encuesta en un grupo de edad
        for (const survey of data) {
            const age = survey.edad;
            if (!age || age <= 0) {
                ageGroups['No especificado']++;
            } else if (age < 18) {
                ageGroups['Menor de 18']++;
            } else if (age <= 30) {
                ageGroups['18-30']++;
            } else if (age <= 45) {
                ageGroups['31-45']++;
            } else if (age <= 60) {
                ageGroups['46-60']++;
            } else {
                ageGroups['Mayor de 60']++;
            }
        }

        // Enviar la respuesta con las estadísticas calculadas
        res.status(200).json({
            totalSurveys,
            appointmentsScheduled,
            ageGroups,
        });

    } catch (error) {
        console.error('Error en la función de estadísticas:', error);
        res.status(500).json({ message: error.message || 'Ocurrió un error en el servidor.' });
    }
};