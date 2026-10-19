// Pruebas del panel de administración. Requiere un usuario administrador:
// CT_ADMIN_USER / CT_ADMIN_PASS (por defecto admin / ct-test-pass en el entorno de pruebas).
const { test, assert, summary, BASE } = require('./lib');
const USER = process.env.CT_ADMIN_USER || 'admin';
const PASS = process.env.CT_ADMIN_PASS || 'ct-test-pass';

async function login(p) {
  await p.goto(BASE + '/wp-login.php', { waitUntil: 'load' });
  await p.fill('#user_login', USER);
  await p.fill('#user_pass', PASS);
  await Promise.all([p.waitForNavigation(), p.click('#wp-submit')]);
}
async function admin(p, path) {
  const r = await p.goto(BASE + '/wp-admin/' + path, { waitUntil: 'load' });
  if (r.status() !== 200) throw new Error('HTTP ' + r.status() + ' en ' + path);
  const body = await p.textContent('body');
  if (/Fatal error|Warning:|Notice:|Deprecated:|There has been a critical error/.test(body)) throw new Error('Error PHP en ' + path + ': ' + body.match(/(Fatal error|Warning|Notice|Deprecated|critical error)[^\n]{0,200}/)[0]);
  return body;
}

(async () => {
  console.log('Panel de administración');
  await test('Todas las pantallas cargan sin errores', async p => {
    await login(p);
    for (const path of ['admin.php?page=clicktools', 'admin.php?page=clicktools-tools', 'admin.php?page=clicktools-tools&cat=pdf', 'admin.php?page=clicktools-tools&s=iva', 'admin.php?page=clicktools-tools&edit=unir-pdf', 'admin.php?page=clicktools-custom', 'admin.php?page=clicktools-custom&new=1', 'edit.php?post_type=ct_message', 'admin.php?page=clicktools-stats', 'admin.php?page=clicktools-stats&days=90',
      'admin.php?page=clicktools-settings', 'admin.php?page=clicktools-settings&tab=legal', 'admin.php?page=clicktools-settings&tab=forms', 'admin.php?page=clicktools-settings&tab=privacy', 'admin.php?page=clicktools-settings&tab=ads', 'admin.php?page=clicktools-settings&tab=server', 'admin.php?page=clicktools-settings&tab=seo', 'admin.php?page=clicktools-settings&tab=site', 'plugins.php', 'index.php']) {
      await admin(p, path);
    }
  });

  await test('Editar el nombre de una herramienta se refleja en la web y se puede restablecer', async p => {
    await login(p);
    await admin(p, 'admin.php?page=clicktools-tools&edit=calcular-iva');
    await p.fill('#ct-tool-name', 'Calculadora de IVA (prueba)');
    await Promise.all([p.waitForNavigation(), p.click('#submit')]);
    assert((await p.textContent('.notice-success')).includes('guardados'), 'sin aviso');
    await p.goto(BASE + '/calculadoras/calcular-iva/');
    assert((await p.textContent('h1')).includes('Calculadora de IVA (prueba)'), 'H1 no cambia');
    await admin(p, 'admin.php?page=clicktools-tools&edit=calcular-iva');
    p.once('dialog', d => d.accept());
    await Promise.all([p.waitForNavigation(), p.click('button:has-text("Restablecer valores originales")')]);
    await p.goto(BASE + '/calculadoras/calcular-iva/');
    assert(!(await p.textContent('h1')).includes('(prueba)'), 'No se restableció');
  });

  await test('Acción masiva: desactivar oculta la herramienta (404) y activar la recupera', async p => {
    await login(p);
    await admin(p, 'admin.php?page=clicktools-tools&s=calcular-propina');
    await p.check('#ct-cb-calcular-propina');
    await p.selectOption('#bulk-action-selector-top', 'disable');
    await Promise.all([p.waitForNavigation(), p.click('#doaction')]);
    assert((await p.textContent('body')).includes('Acción aplicada'), 'sin aviso bulk');
    let r = await p.goto(BASE + '/calculadoras/calcular-propina/');
    assert(r.status() === 404, 'esperaba 404, fue ' + r.status());
    await admin(p, 'admin.php?page=clicktools-tools&tstatus=off');
    await p.check('#ct-cb-calcular-propina');
    await p.selectOption('#bulk-action-selector-top', 'enable');
    await Promise.all([p.waitForNavigation(), p.click('#doaction')]);
    r = await p.goto(BASE + '/calculadoras/calcular-propina/');
    assert(r.status() === 200, 'esperaba 200, fue ' + r.status());
  });

  await test('Calculadora propia: fórmula inválida se rechaza y la válida funciona en la web', async p => {
    await login(p);
    await admin(p, 'admin.php?page=clicktools-custom&new=1');
    await p.fill('#ct-c-name', 'Coste de impresión');
    await p.fill('#ct-c-slug', 'coste-impresion-prueba');
    await p.fill('#ct-c-desc', 'Calcula el coste de imprimir copias.');
    await p.fill('input[name="c[inputs][0][key]"]', 'paginas');
    await p.fill('input[name="c[inputs][0][label]"]', 'Páginas');
    await p.fill('input[name="c[inputs][0][default]"]', '10');
    await p.fill('input[name="c[inputs][1][key]"]', 'precio');
    await p.fill('input[name="c[inputs][1][label]"]', 'Precio por página');
    await p.fill('input[name="c[inputs][1][default]"]', '0,05');
    await p.fill('input[name="c[outputs][0][label]"]', 'Total');
    await p.fill('input[name="c[outputs][0][formula]"]', 'paginas * precio + desconocido');
    await p.waitForTimeout(200);
    assert((await p.textContent('.ct-formula-msg')).includes('✗'), 'la validación en vivo no detecta el error');
    await p.check('input[name="c[enabled]"]');
    await Promise.all([p.waitForNavigation(), p.click('#submit')]);
    assert((await p.textContent('body')).includes('Nombre desconocido en la fórmula: «desconocido»'), 'el servidor no rechazó la fórmula');
    // El borrador se conserva: corregimos la fórmula.
    await p.fill('input[name="c[outputs][0][formula]"]', 'round(paginas * precio * 100) / 100');
    await p.waitForTimeout(200);
    assert((await p.textContent('#ct-custom-preview')).includes('0,5'), await p.textContent('#ct-custom-preview'));
    await Promise.all([p.waitForNavigation(), p.click('#submit')]);
    assert((await p.textContent('.notice-success')).includes('guardados'), 'no se guardó');
    await p.goto(BASE + '/calculadoras/coste-impresion-prueba/', { waitUntil: 'networkidle' });
    await p.waitForSelector('.ct-app[data-ready] .ct-result');
    const t = await p.textContent('.ct-app');
    assert(t.includes('0,50'), t.slice(0, 300));
    // Eliminar.
    await admin(p, 'admin.php?page=clicktools-custom');
    p.once('dialog', d => d.accept());
    await Promise.all([p.waitForNavigation(), p.click('button:has-text("Eliminar")')]);
    const r = await p.goto(BASE + '/calculadoras/coste-impresion-prueba/');
    assert(r.status() === 404, 'sigue existiendo');
  });

  await test('Ajustes: datos legales aparecen en el aviso legal; correo inválido se rechaza', async p => {
    await login(p);
    await admin(p, 'admin.php?page=clicktools-settings&tab=legal');
    await p.fill('#ct-owner_name', 'Titular de Prueba');
    await p.fill('#ct-owner_email', 'no-es-un-correo');
    // El navegador ya bloquea el envío por el tipo email; se desactiva para probar la validación del servidor.
    await p.evaluate(() => { document.querySelector('#ct-owner_email').form.noValidate = true; });
    await Promise.all([p.waitForNavigation(), p.click('#submit')]);
    assert((await p.textContent('body')).includes('no es un correo válido'), 'sin error de correo');
    assert(await p.inputValue('#ct-owner_name') === 'Titular de Prueba', 'no guardó el nombre');
    await p.goto(BASE + '/aviso-legal/');
    assert((await p.textContent('main')).includes('Titular de Prueba'), 'el aviso legal no muestra el titular');
    await admin(p, 'admin.php?page=clicktools-settings&tab=legal');
    await p.fill('#ct-owner_name', '');
    await Promise.all([p.waitForNavigation(), p.click('#submit')]);
  });

  await test('Mensajes: un envío del formulario aparece en el panel y se puede revisar', async p => {
    const tok = await (await fetch(BASE + '/wp-json/clicktools/v1/token?action=message')).json();
    await new Promise(r => setTimeout(r, 3200));
    const res = await fetch(BASE + '/wp-json/clicktools/v1/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: tok.token, type: 'suggestion', title: 'Convertir HEIC a JPG', message: 'Sería útil poder convertir fotos HEIC del iPhone.', category: 'imagenes' }) });
    assert(res.status === 200 || res.status === 201, 'envío ' + res.status + ' ' + (await res.text()));
    await login(p);
    const body = await admin(p, 'edit.php?post_type=ct_message');
    assert(body.includes('Convertir HEIC a JPG') && body.includes('Nueva'), body.slice(0, 200));
    await p.click('a.row-title:has-text("Convertir HEIC a JPG")');
    await p.waitForSelector('#ct-review-state');
    await p.selectOption('#ct-review-state', 'planned');
    await p.selectOption('#ct-review-priority', '3');
    await Promise.all([p.waitForNavigation(), p.click('#publish')]);
    const list = await admin(p, 'edit.php?post_type=ct_message&ct_state=planned');
    assert(list.includes('Convertir HEIC a JPG') && list.includes('Alta'), 'estado no guardado');
  });

  const s = summary();
  process.exit(s.failed ? 1 : 0);
})();
