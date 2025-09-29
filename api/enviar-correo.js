// Importa las librerías necesarias
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');
const Papa = require('papaparse');

// Esta es la función principal que Vercel ejecutará
module.exports = async (req, res) => {
    // 1. VERIFICACIÓN DE SEGURIDAD
    // Solo permitir peticiones POST
    if (req.method !== 'POST') {
        res.setHeader('Allow', ['POST']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        // 2. OBTENER DATOS DE LA PETICIÓN
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'La dirección de correo es requerida.' });
        }

        // 3. CONFIGURAR CLIENTES (DE FORMA SEGURA)
        // Estas variables deben ser configuradas en Vercel (Project > Settings > Environment Variables)
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // ¡IMPORTANTE! Usar la clave de SERVICIO
        const resendApiKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.FROM_EMAIL; // El correo que configuraste en Resend

        // Inicializar Supabase con la clave de servicio para tener acceso total
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        // Inicializar Resend
        const resend = new Resend(resendApiKey);

        // 4. OBTENER DATOS DE SUPABASE
        const { data, error } = await supabase
            .from('encuesta')
            .select('*') // '*': selecciona todas las columnas
            .order('created_at', { ascending: false }); // Ordena por fecha de creación

        if (error) {
            console.error('Error al obtener datos de Supabase:', error);
            throw new Error('No se pudieron obtener los datos de la base de datos.');
        }

        if (!data || data.length === 0) {
            return res.status(200).json({ message: 'No hay datos en la encuesta para enviar.' });
        }

        // 5. CONVERTIR DATOS A CSV
        // Papaparse convierte un array de objetos JSON a un string en formato CSV
        const csv = Papa.unparse(data);
        const csvBuffer = Buffer.from(csv, 'utf-8');

        // 6. ENVIAR EL CORREO
        const { data: sendData, error: sendError } = await resend.emails.send({
            from: fromEmail, // Ej: 'Reportes <reportes@tu-dominio.com>'
            to: [email],
            subject: 'Reporte de Encuestas de Salud Visual',
            html: `
                <h1>Reporte de Encuestas</h1>
                <p>Hola,</p>
                <p>Se ha generado un nuevo reporte con los datos de la encuesta de salud visual.</p>
                <p>Puedes encontrar todos los datos en el archivo CSV adjunto.</p>
                <p>Fecha de generación: ${new Date().toLocaleString()}</p>
            `,
            attachments: [
                {
                    filename: 'reporte_encuestas.csv',
                    content: csvBuffer,
                },
            ],
        });

        if (sendError) {
            console.error('Error al enviar el correo:', sendError);
            throw new Error('No se pudo enviar el correo con el reporte.');
        }

        // 7. ENVIAR RESPUESTA DE ÉXITO
        return res.status(200).json({ message: 'Correo enviado exitosamente.' });

    } catch (error) {
        console.error('Error en la función serverless:', error);
        return res.status(500).json({ message: error.message || 'Ocurrió un error en el servidor.' });
    }
};
