'use client'

/** Contenido reutilizable de la Política de Tratamiento de Datos (Colombia). */
export default function PrivacyPolicyContent() {
  return (
    <div className="text-sm text-gray-700 font-sans space-y-4">
      <p className="font-semibold text-gray-900">Política de Tratamiento de Datos Personales</p>
      <p className="font-medium text-gray-800">Controla — Versión 1.0</p>
      <p>Fecha de vigencia: 1 de enero de 2026</p>

      <section>
        <p className="font-semibold text-gray-900 mt-4">1. Identificación del responsable</p>
        <p>
          Controla es una aplicación web de organización financiera operada por una persona natural domiciliada en Colombia (en adelante, &quot;Controla&quot; o &quot;la aplicación&quot;).
        </p>
        <p>
          Para efectos de la Ley 1581 de 2012 y demás normas aplicables en Colombia, el responsable del tratamiento de los datos personales es el titular de la aplicación Controla.
        </p>
        <p>
          Para cualquier solicitud relacionada con datos personales puedes escribir a: fmunozhu@gmail.com
        </p>
      </section>

      <section>
        <p className="font-semibold text-gray-900 mt-4">2. Datos que recolectamos</p>
        <p>Controla recolecta únicamente los datos necesarios para el funcionamiento de la aplicación.</p>
        <p className="font-medium mt-2">2.1 Datos de autenticación (a través de Google OAuth)</p>
        <p>Al registrarte o iniciar sesión con Google, podemos recibir:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Nombre</li>
          <li>Correo electrónico</li>
          <li>Imagen de perfil (si está disponible en tu cuenta de Google)</li>
          <li>Identificador único asociado a tu cuenta</li>
        </ul>
        <p>Controla no solicita ni almacena contraseñas, ya que la autenticación se realiza directamente mediante Google.</p>
        <p className="font-medium mt-2">2.2 Información financiera ingresada por el usuario</p>
        <p>La aplicación permite registrar información como:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Ingresos</li>
          <li>Obligaciones y gastos</li>
          <li>Metas y compromisos temporales</li>
          <li>Categorías</li>
          <li>Fechas de vencimiento</li>
          <li>Estados de pago</li>
          <li>Espacios compartidos y asignaciones</li>
        </ul>
        <p>Esta información es ingresada manualmente por el usuario. Controla no tiene acceso a cuentas bancarias, tarjetas, ni realiza movimientos financieros en nombre del usuario.</p>
        <p className="font-medium mt-2">2.3 Datos de terceros dentro de espacios</p>
        <p>La aplicación permite que los usuarios registren información asociada a otras personas dentro de espacios compartidos (por ejemplo, nombres o asignaciones de pagos).</p>
        <p>El usuario declara que cuenta con la autorización necesaria de las personas cuyos datos registre dentro de la aplicación.</p>
        <p>Controla no verifica ni recolecta directamente datos personales de terceros fuera de lo que el propio usuario ingrese voluntariamente.</p>
      </section>

      <section>
        <p className="font-semibold text-gray-900 mt-4">3. Finalidad del tratamiento</p>
        <p>Los datos personales recolectados son utilizados exclusivamente para:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Permitir el acceso y autenticación del usuario.</li>
          <li>Crear y administrar espacios financieros.</li>
          <li>Mostrar ingresos, obligaciones y disponible real.</li>
          <li>Facilitar la organización de información financiera.</li>
          <li>Mejorar la experiencia de uso de la aplicación.</li>
          <li>Brindar soporte técnico.</li>
        </ul>
        <p>Controla no vende, alquila ni comercializa datos personales.</p>
      </section>

      <section>
        <p className="font-semibold text-gray-900 mt-4">4. Almacenamiento y seguridad</p>
        <p>Los datos son almacenados en infraestructura tecnológica de terceros que actúan como encargados del tratamiento, incluyendo:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Supabase (base de datos)</li>
          <li>Netlify (infraestructura de hosting)</li>
        </ul>
        <p>Controla adopta medidas razonables de seguridad para proteger la información contra acceso no autorizado, alteración o pérdida.</p>
      </section>

      <section>
        <p className="font-semibold text-gray-900 mt-4">5. Transferencia y acceso a terceros</p>
        <p>Controla no comparte datos personales con terceros para fines comerciales.</p>
        <p>Los datos pueden ser tratados por proveedores tecnológicos necesarios para el funcionamiento de la aplicación (como servicios de hosting o base de datos), bajo condiciones de confidencialidad.</p>
      </section>

      <section>
        <p className="font-semibold text-gray-900 mt-4">6. Derechos del titular de los datos</p>
        <p>De acuerdo con la Ley 1581 de 2012, el titular tiene derecho a:</p>
        <ul className="list-disc pl-5 mt-1 space-y-1">
          <li>Conocer, actualizar y rectificar sus datos personales.</li>
          <li>Solicitar prueba de la autorización otorgada.</li>
          <li>Ser informado sobre el uso de sus datos.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
          <li>Revocar la autorización y/o solicitar la supresión del dato.</li>
        </ul>
        <p>Para ejercer estos derechos puedes escribir a: fmunozhu@gmail.com</p>
      </section>

      <section>
        <p className="font-semibold text-gray-900 mt-4">7. Eliminación de cuenta</p>
        <p>El usuario podrá solicitar la eliminación de su cuenta y sus datos asociados.</p>
        <p>Controla eliminará la información personal almacenada, salvo aquella que deba conservarse por obligación legal.</p>
      </section>

      <section>
        <p className="font-semibold text-gray-900 mt-4">8. Autorización</p>
        <p>Al registrarse en la aplicación y aceptar la Política de Tratamiento de Datos, el usuario autoriza de manera previa, expresa e informada el tratamiento de sus datos personales conforme a lo aquí establecido.</p>
      </section>

      <section>
        <p className="font-semibold text-gray-900 mt-4">9. Cambios en esta política</p>
        <p>Controla podrá actualizar esta política en cualquier momento.</p>
        <p>Cuando se realicen cambios relevantes, se informará a los usuarios a través de la aplicación.</p>
      </section>
    </div>
  )
}
