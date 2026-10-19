<?php
/**
 * Motores de procesamiento en servidor (opcionales): LibreOffice, Ghostscript,
 * qpdf y FFmpeg.
 *
 * Desactivados por defecto. Las herramientas que los necesitan solo se publican
 * si el administrador activa el procesamiento en servidor Y el motor se detecta
 * realmente en el alojamiento. Los archivos se procesan en un directorio
 * temporal aislado, se devuelven en la misma respuesta y se eliminan al terminar.
 *
 * Seguridad aplicada: token anti-CSRF, límite de solicitudes, límite de tamaño,
 * MIME real (finfo) y firma del archivo, ejecución sin shell (proc_open con
 * array), tiempo máximo, demuxer forzado en FFmpeg, -dSAFER en Ghostscript y
 * contraseñas de qpdf pasadas por archivo temporal (no visibles en la lista de procesos).
 *
 * @package ClickTools
 */

namespace ClickTools;

defined( 'ABSPATH' ) || exit;

/**
 * Motores de servidor.
 */
class Engines {

	/**
	 * Definición de motores.
	 *
	 * @return array
	 */
	public static function engines() {
		return array(
			'libreoffice' => array(
				'label'   => 'LibreOffice',
				'bins'    => array( 'soffice', 'libreoffice' ),
				'setting' => 'path_libreoffice',
			),
			'ghostscript' => array(
				'label'   => 'Ghostscript',
				'bins'    => array( 'gs' ),
				'setting' => 'path_ghostscript',
			),
			'qpdf'        => array(
				'label'   => 'qpdf',
				'bins'    => array( 'qpdf' ),
				'setting' => 'path_qpdf',
			),
			'ffmpeg'      => array(
				'label'   => 'FFmpeg',
				'bins'    => array( 'ffmpeg' ),
				'setting' => 'path_ffmpeg',
			),
		);
	}

	/**
	 * Operaciones disponibles (clave de herramienta => definición).
	 *
	 * @return array
	 */
	public static function operations() {
		$office = array(
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
			'application/msword'                      => 'doc',
			'application/vnd.oasis.opendocument.text' => 'odt',
			'text/rtf'                                => 'rtf',
			'application/rtf'                         => 'rtf',
		);
		$video  = array(
			'video/mp4'        => 'mov',
			'video/quicktime'  => 'mov',
			'video/webm'       => 'matroska',
			'video/x-matroska' => 'matroska',
			'video/x-msvideo'  => 'avi',
			'video/avi'        => 'avi',
			'video/3gpp'       => 'mov',
		);
		$audio  = array(
			'audio/mpeg'  => 'mp3',
			'audio/x-wav' => 'wav',
			'audio/wav'   => 'wav',
			'audio/ogg'   => 'ogg',
			'audio/flac'  => 'flac',
			'audio/x-flac' => 'flac',
			'audio/mp4'   => 'mov',
			'audio/x-m4a' => 'mov',
			'audio/webm'  => 'matroska',
		);
		return array(
			'docx-pdf'      => array( 'engine' => 'libreoffice', 'accept' => $office, 'ext' => '.docx,.doc,.odt,.rtf' ),
			'pdf-docx'      => array( 'engine' => 'libreoffice', 'accept' => array( 'application/pdf' => 'pdf' ), 'ext' => '.pdf' ),
			'pdf-compress'  => array( 'engine' => 'ghostscript', 'accept' => array( 'application/pdf' => 'pdf' ), 'ext' => '.pdf' ),
			'pdf-protect'   => array( 'engine' => 'qpdf', 'accept' => array( 'application/pdf' => 'pdf' ), 'ext' => '.pdf' ),
			'pdf-unlock'    => array( 'engine' => 'qpdf', 'accept' => array( 'application/pdf' => 'pdf' ), 'ext' => '.pdf' ),
			'video-convert' => array( 'engine' => 'ffmpeg', 'accept' => $video, 'ext' => '.mp4,.mov,.webm,.mkv,.avi,.3gp' ),
			'video-compress' => array( 'engine' => 'ffmpeg', 'accept' => $video, 'ext' => '.mp4,.mov,.webm,.mkv,.avi,.3gp' ),
			'audio-convert' => array( 'engine' => 'ffmpeg', 'accept' => array_merge( $audio, $video ), 'ext' => '.mp3,.wav,.ogg,.flac,.m4a,.mp4,.mov,.webm,.mkv' ),
		);
	}

	/**
	 * ¿Puede PHP ejecutar procesos?
	 *
	 * @return bool
	 */
	public static function can_exec() {
		if ( ! function_exists( 'proc_open' ) ) {
			return false;
		}
		$disabled = array_map( 'trim', explode( ',', (string) ini_get( 'disable_functions' ) ) );
		return ! in_array( 'proc_open', $disabled, true ) && ! in_array( 'proc_get_status', $disabled, true );
	}

	/**
	 * Ruta del ejecutable de un motor, o cadena vacía.
	 *
	 * @param string $engine Motor.
	 * @return string
	 */
	public static function binary( $engine ) {
		static $found = array();
		if ( isset( $found[ $engine ] ) ) {
			return $found[ $engine ];
		}
		$defs = self::engines();
		if ( ! isset( $defs[ $engine ] ) || ! self::can_exec() ) {
			$found[ $engine ] = '';
			return '';
		}
		$configured = (string) clicktools_setting( $defs[ $engine ]['setting'], '' );
		$candidates = array();
		if ( $configured ) {
			$candidates[] = $configured;
		}
		foreach ( array( '/usr/bin', '/usr/local/bin', '/opt/homebrew/bin', '/snap/bin', '/opt/libreoffice/program' ) as $dir ) {
			foreach ( $defs[ $engine ]['bins'] as $bin ) {
				$candidates[] = $dir . '/' . $bin;
			}
		}
		$found[ $engine ] = '';
		foreach ( $candidates as $path ) {
			// phpcs:ignore WordPress.PHP.NoSilencedErrors -- open_basedir puede impedir la comprobación.
			if ( @is_file( $path ) && @is_executable( $path ) ) {
				$found[ $engine ] = $path;
				break;
			}
		}
		return $found[ $engine ];
	}

	/**
	 * Estado de todos los motores.
	 *
	 * @return array
	 */
	public static function status() {
		$out = array();
		foreach ( self::engines() as $key => $def ) {
			$out[ $key ] = array(
				'label' => $def['label'],
				'path'  => self::binary( $key ),
			);
		}
		return $out;
	}

	/**
	 * ¿Está disponible la herramienta de servidor?
	 *
	 * @param array $tool Herramienta.
	 * @return bool
	 */
	public static function tool_available( array $tool ) {
		if ( ! clicktools_setting( 'server_enabled' ) ) {
			return false;
		}
		$ops = self::operations();
		if ( empty( $tool['key'] ) || ! isset( $ops[ $tool['key'] ] ) ) {
			return false;
		}
		return '' !== self::binary( $ops[ $tool['key'] ]['engine'] );
	}

	/**
	 * Límites de procesamiento en servidor para una herramienta.
	 *
	 * Filtro clicktools_server_limits: permite a una extensión (por ejemplo, una futura versión
	 * Pro con cuentas) ajustar tamaño máximo, usos por hora y tiempo máximo.
	 *
	 * @param array $tool Herramienta.
	 * @return array{max_mb:int,rate_hour:int,timeout:int}
	 */
	public static function limits( array $tool ) {
		$limits = apply_filters(
			'clicktools_server_limits',
			array(
				'max_mb'    => (int) clicktools_setting( 'server_max_mb', 25 ),
				'rate_hour' => (int) clicktools_setting( 'server_rate_hour', 20 ),
				'timeout'   => (int) clicktools_setting( 'server_timeout', 120 ),
			),
			$tool
		);
		return array(
			'max_mb'    => max( 1, (int) $limits['max_mb'] ),
			'rate_hour' => max( 0, (int) $limits['rate_hour'] ),
			'timeout'   => max( 5, (int) $limits['timeout'] ),
		);
	}

	/**
	 * Información para el cliente.
	 *
	 * @param array $tool Herramienta.
	 * @return array
	 */
	public static function client_info( array $tool ) {
		$ops = self::operations();
		$op  = isset( $ops[ $tool['key'] ] ) ? $ops[ $tool['key'] ] : null;
		return array(
			'available' => self::tool_available( $tool ),
			'maxMb'     => self::limits( $tool )['max_mb'],
			'accept'    => $op ? $op['ext'] : '',
			'endpoint'  => esc_url_raw( rest_url( 'clicktools/v1/process/' . $tool['slug'] ) ),
		);
	}

	/**
	 * Directorio temporal privado.
	 *
	 * @return string|false
	 */
	public static function temp_root() {
		$uploads = wp_upload_dir( null, false );
		$root    = trailingslashit( $uploads['basedir'] ) . 'clicktools-tmp';
		if ( ! wp_mkdir_p( $root ) ) {
			return false;
		}
		if ( ! file_exists( $root . '/.htaccess' ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $root . '/.htaccess', "Require all denied\nDeny from all\n" );
		}
		if ( ! file_exists( $root . '/index.php' ) ) {
			// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
			file_put_contents( $root . '/index.php', "<?php\n// Silence is golden.\n" );
		}
		return $root;
	}

	/**
	 * Procesa una solicitud.
	 *
	 * @param array            $tool    Herramienta.
	 * @param \WP_REST_Request $request Solicitud.
	 * @return \WP_Error|void Envía el archivo y termina, o devuelve un error.
	 */
	public static function process( array $tool, \WP_REST_Request $request ) {
		if ( ! self::tool_available( $tool ) ) {
			return new \WP_Error( 'ct_unavailable', __( 'Esta herramienta no está disponible en este servidor.', 'clicktools' ), array( 'status' => 404 ) );
		}
		$check = Security::verify_token( (string) $request->get_param( 'token' ), 'process' );
		if ( is_wp_error( $check ) ) {
			return $check;
		}
		$limits = self::limits( $tool );
		if ( ! Security::rate_limit( 'process', $limits['rate_hour'] ) ) {
			return new \WP_Error( 'ct_rate', __( 'Has alcanzado el límite de procesamientos por hora. Inténtalo más tarde.', 'clicktools' ), array( 'status' => 429 ) );
		}
		$ops   = self::operations();
		$op    = $ops[ $tool['key'] ];
		$files = $request->get_file_params();
		$file  = isset( $files['file'] ) ? $files['file'] : null;
		if ( ! $file || ! empty( $file['error'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
			return new \WP_Error( 'ct_upload', __( 'No se ha recibido el archivo. Comprueba su tamaño e inténtalo de nuevo.', 'clicktools' ), array( 'status' => 400 ) );
		}
		$max = $limits['max_mb'] * MB_IN_BYTES;
		if ( (int) $file['size'] <= 0 || (int) $file['size'] > $max ) {
			return new \WP_Error( 'ct_size', __( 'El archivo supera el tamaño máximo permitido en el servidor.', 'clicktools' ), array( 'status' => 413 ) );
		}
		$finfo = new \finfo( FILEINFO_MIME_TYPE );
		$mime  = (string) $finfo->file( $file['tmp_name'] );
		if ( 'application/zip' === $mime || 'application/octet-stream' === $mime ) {
			$mime = self::refine_mime( $file['tmp_name'], $mime );
		}
		if ( ! isset( $op['accept'][ $mime ] ) ) {
			return new \WP_Error( 'ct_type', __( 'El contenido del archivo no corresponde a un formato admitido. No basta con cambiar la extensión.', 'clicktools' ), array( 'status' => 415 ) );
		}

		$root = self::temp_root();
		if ( ! $root ) {
			return new \WP_Error( 'ct_tmp', __( 'El servidor no tiene un directorio temporal disponible.', 'clicktools' ), array( 'status' => 500 ) );
		}
		$dir = $root . '/' . wp_generate_password( 24, false, false );
		wp_mkdir_p( $dir . '/out' );
		$in_ext = $op['accept'][ $mime ];
		$in     = $dir . '/input.' . ( in_array( $in_ext, array( 'mov', 'matroska', 'avi', 'mp3', 'wav', 'ogg', 'flac' ), true ) ? 'bin' : $in_ext );
		if ( ! move_uploaded_file( $file['tmp_name'], $in ) ) {
			self::cleanup( $dir );
			return new \WP_Error( 'ct_move', __( 'No se ha podido preparar el archivo.', 'clicktools' ), array( 'status' => 500 ) );
		}

		$result = self::run_operation( $tool['key'], $op, $in, $in_ext, $dir, $request );
		if ( is_wp_error( $result ) ) {
			self::cleanup( $dir );
			return $result;
		}
		self::send_file( $result['path'], $result['name'], $result['mime'] );
		self::cleanup( $dir );
		exit;
	}

	/**
	 * Distingue DOCX/ODT dentro de contenedores ZIP.
	 *
	 * @param string $path Archivo.
	 * @param string $mime MIME detectado.
	 * @return string
	 */
	private static function refine_mime( $path, $mime ) {
		if ( class_exists( '\ZipArchive' ) ) {
			$zip = new \ZipArchive();
			if ( true === $zip->open( $path ) ) {
				$is_docx = false !== $zip->locateName( 'word/document.xml' );
				$odt     = $zip->getFromName( 'mimetype' );
				$zip->close();
				if ( $is_docx ) {
					return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
				}
				if ( 'application/vnd.oasis.opendocument.text' === $odt ) {
					return $odt;
				}
			}
		}
		return $mime;
	}

	/**
	 * Construye y ejecuta el comando de la operación.
	 *
	 * @param string           $key     Operación.
	 * @param array            $op      Definición.
	 * @param string           $in      Entrada.
	 * @param string           $in_ext  Tipo/demuxer de entrada.
	 * @param string           $dir     Directorio de trabajo.
	 * @param \WP_REST_Request $request Parámetros.
	 * @return array|\WP_Error path, name, mime
	 */
	private static function run_operation( $key, array $op, $in, $in_ext, $dir, \WP_REST_Request $request ) {
		$bin  = self::binary( $op['engine'] );
		$out  = $dir . '/out';
		$base = sanitize_file_name( pathinfo( (string) $request->get_param( 'name' ), PATHINFO_FILENAME ) );
		$base = $base ? mb_substr( $base, 0, 80 ) : 'clicktools';
		$env  = array(
			'HOME' => $dir,
			'PATH' => '/usr/bin:/bin:/usr/local/bin',
		);

		switch ( $key ) {
			case 'docx-pdf':
			case 'pdf-docx':
				$to  = 'docx-pdf' === $key ? 'pdf' : 'docx:MS Word 2007 XML';
				$cmd = array( $bin, '-env:UserInstallation=file://' . $dir . '/profile', '--headless', '--norestore', '--nolockcheck', '--nodefault' );
				if ( 'pdf-docx' === $key ) {
					$cmd[] = '--infilter=writer_pdf_import';
				}
				$cmd    = array_merge( $cmd, array( '--convert-to', $to, '--outdir', $out, $in ) );
				$target = $out . '/input.' . ( 'docx-pdf' === $key ? 'pdf' : 'docx' );
				$name   = $base . ( 'docx-pdf' === $key ? '.pdf' : '.docx' );
				$mime   = 'docx-pdf' === $key ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
				break;

			case 'pdf-compress':
				$level  = in_array( $request->get_param( 'level' ), array( 'screen', 'ebook', 'printer' ), true ) ? $request->get_param( 'level' ) : 'ebook';
				$target = $out . '/output.pdf';
				$cmd    = array( $bin, '-dSAFER', '-dBATCH', '-dNOPAUSE', '-dQUIET', '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.5', '-dPDFSETTINGS=/' . $level, '-sOutputFile=' . $target, $in );
				$name   = $base . '-comprimido.pdf';
				$mime   = 'application/pdf';
				break;

			case 'pdf-protect':
			case 'pdf-unlock':
				$password = (string) $request->get_param( 'password' );
				if ( '' === $password || strlen( $password ) > 128 || preg_match( '/[\r\n]/', $password ) ) {
					return new \WP_Error( 'ct_password', __( 'Indica una contraseña válida (máximo 128 caracteres).', 'clicktools' ), array( 'status' => 400 ) );
				}
				$target  = $out . '/output.pdf';
				$argfile = $dir . '/args.txt';
				if ( 'pdf-protect' === $key ) {
					$owner = (string) $request->get_param( 'owner' );
					$owner = '' !== $owner && strlen( $owner ) <= 128 && ! preg_match( '/[\r\n]/', $owner ) ? $owner : wp_generate_password( 32, true, false );
					$args  = array( '--encrypt', $password, $owner, '256', '--', $in, $target );
					$name  = $base . '-protegido.pdf';
				} else {
					$args = array( '--password=' . $password, '--decrypt', $in, $target );
					$name = $base . '-desbloqueado.pdf';
				}
				// phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
				file_put_contents( $argfile, implode( "\n", $args ) . "\n" );
				chmod( $argfile, 0600 );
				$cmd  = array( $bin, '@' . $argfile );
				$mime = 'application/pdf';
				break;

			case 'video-convert':
			case 'video-compress':
				$format = 'webm' === $request->get_param( 'format' ) ? 'webm' : 'mp4';
				$crf    = max( 18, min( 40, (int) $request->get_param( 'crf' ) ? (int) $request->get_param( 'crf' ) : 26 ) );
				$height = (int) $request->get_param( 'height' );
				$target = $out . '/output.' . $format;
				$cmd    = array( $bin, '-nostdin', '-hide_banner', '-loglevel', 'error', '-f', $in_ext, '-i', $in );
				if ( in_array( $height, array( 360, 480, 720, 1080 ), true ) ) {
					$cmd = array_merge( $cmd, array( '-vf', 'scale=-2:' . $height ) );
				}
				if ( 'webm' === $format ) {
					$cmd = array_merge( $cmd, array( '-c:v', 'libvpx-vp9', '-crf', (string) ( $crf + 6 ), '-b:v', '0', '-deadline', 'realtime', '-cpu-used', '8', '-c:a', 'libopus' ) );
				} else {
					$cmd = array_merge( $cmd, array( '-c:v', 'libx264', '-preset', 'veryfast', '-crf', (string) $crf, '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart' ) );
				}
				$cmd[]  = '-y';
				$cmd[]  = $target;
				$name   = $base . ( 'video-compress' === $key ? '-comprimido.' : '.' ) . $format;
				$mime   = 'webm' === $format ? 'video/webm' : 'video/mp4';
				break;

			case 'audio-convert':
				$formats = array(
					'mp3' => array( array( '-c:a', 'libmp3lame', '-q:a', '2' ), 'audio/mpeg' ),
					'ogg' => array( array( '-c:a', 'libvorbis', '-q:a', '5' ), 'audio/ogg' ),
					'wav' => array( array( '-c:a', 'pcm_s16le' ), 'audio/wav' ),
					'm4a' => array( array( '-c:a', 'aac', '-b:a', '192k' ), 'audio/mp4' ),
				);
				$format  = array_key_exists( (string) $request->get_param( 'format' ), $formats ) ? (string) $request->get_param( 'format' ) : 'mp3';
				$target  = $out . '/output.' . $format;
				$cmd     = array_merge( array( $bin, '-nostdin', '-hide_banner', '-loglevel', 'error', '-f', $in_ext, '-i', $in, '-vn' ), $formats[ $format ][0], array( '-y', $target ) );
				$name    = $base . '.' . $format;
				$mime    = $formats[ $format ][1];
				break;

			default:
				return new \WP_Error( 'ct_op', __( 'Operación no admitida.', 'clicktools' ), array( 'status' => 400 ) );
		}

		$run = self::run( $cmd, $env, $limits['timeout'], $dir );
		if ( is_wp_error( $run ) ) {
			return $run;
		}
		if ( ! file_exists( $target ) || 0 === filesize( $target ) ) {
			$msg = 'pdf-unlock' === $key
				? __( 'No se ha podido desbloquear el PDF. Comprueba que la contraseña es correcta.', 'clicktools' )
				: __( 'El motor no ha podido procesar el archivo. Puede estar dañado o usar funciones no compatibles.', 'clicktools' );
			return new \WP_Error( 'ct_failed', $msg, array( 'status' => 422 ) );
		}
		return array(
			'path' => $target,
			'name' => $name,
			'mime' => $mime,
		);
	}

	/**
	 * Ejecuta un proceso sin shell y con tiempo máximo.
	 *
	 * @param array  $cmd     Comando como array (sin interpretación de shell).
	 * @param array  $env     Variables de entorno.
	 * @param int    $timeout Segundos.
	 * @param string $cwd     Directorio de trabajo.
	 * @return true|\WP_Error
	 */
	public static function run( array $cmd, array $env, $timeout, $cwd ) {
		$spec  = array(
			0 => array( 'pipe', 'r' ),
			1 => array( 'pipe', 'w' ),
			2 => array( 'pipe', 'w' ),
		);
		$proc  = proc_open( $cmd, $spec, $pipes, $cwd, $env ); // phpcs:ignore Generic.PHP.ForbiddenFunctions
		if ( ! is_resource( $proc ) ) {
			return new \WP_Error( 'ct_exec', __( 'No se ha podido iniciar el motor de procesamiento.', 'clicktools' ), array( 'status' => 500 ) );
		}
		fclose( $pipes[0] );
		stream_set_blocking( $pipes[1], false );
		stream_set_blocking( $pipes[2], false );
		$start = time();
		$code  = null;
		while ( true ) {
			$status = proc_get_status( $proc );
			stream_get_contents( $pipes[1] );
			stream_get_contents( $pipes[2] );
			if ( ! $status['running'] ) {
				$code = $status['exitcode'];
				break;
			}
			if ( time() - $start > $timeout ) {
				proc_terminate( $proc, 9 );
				fclose( $pipes[1] );
				fclose( $pipes[2] );
				proc_close( $proc );
				return new \WP_Error( 'ct_timeout', __( 'El procesamiento ha superado el tiempo máximo. Prueba con un archivo más pequeño.', 'clicktools' ), array( 'status' => 504 ) );
			}
			usleep( 100000 );
		}
		fclose( $pipes[1] );
		fclose( $pipes[2] );
		proc_close( $proc );
		return true;
	}

	/**
	 * Envía un archivo como descarga.
	 *
	 * @param string $path Ruta.
	 * @param string $name Nombre.
	 * @param string $mime MIME.
	 */
	private static function send_file( $path, $name, $mime ) {
		nocache_headers();
		header( 'Content-Type: ' . $mime );
		header( 'Content-Length: ' . filesize( $path ) );
		header( 'Content-Disposition: attachment; filename="' . rawurlencode( $name ) . '"; filename*=UTF-8\'\'' . rawurlencode( $name ) );
		header( 'X-Content-Type-Options: nosniff' );
		readfile( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_readfile
	}

	/**
	 * Borra un directorio temporal de forma recursiva (solo dentro de clicktools-tmp).
	 *
	 * @param string $dir Directorio.
	 */
	public static function cleanup( $dir ) {
		$root = self::temp_root();
		if ( ! $root || 0 !== strpos( realpath( $dir ) ? realpath( $dir ) : '', realpath( $root ) ) || ! is_dir( $dir ) ) {
			return;
		}
		$it = new \RecursiveIteratorIterator(
			new \RecursiveDirectoryIterator( $dir, \FilesystemIterator::SKIP_DOTS ),
			\RecursiveIteratorIterator::CHILD_FIRST
		);
		foreach ( $it as $item ) {
			if ( $item->isDir() && ! $item->isLink() ) {
				rmdir( $item->getPathname() );
			} else {
				unlink( $item->getPathname() );
			}
		}
		rmdir( $dir );
	}

	/**
	 * Limpieza periódica de restos (por ejemplo, si un proceso se interrumpió).
	 */
	public static function cleanup_stale() {
		$root = self::temp_root();
		if ( ! $root ) {
			return;
		}
		foreach ( (array) glob( $root . '/*', GLOB_ONLYDIR ) as $dir ) {
			if ( filemtime( $dir ) < time() - HOUR_IN_SECONDS ) {
				self::cleanup( $dir );
			}
		}
	}
}
