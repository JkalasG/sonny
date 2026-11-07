"""Pruebas del preprocesado (Python). Ejecutar desde modelo/:  python -m unittest -v"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from preprocess import PARITY_CASES, preprocess  # noqa: E402

ZWNJ, ZWSP, BOM, SHY = chr(0x200C), chr(0x200B), chr(0xFEFF), chr(0x00AD)


class TestMarcadores(unittest.TestCase):
    def test_enlaces(self):
        for t in ["https://bit.ly/3xYz", "http://185.23.11.4/login", "www.ejemplo.com/ruta",
                  "entregas-envio.info/pago", "mibanco.com.verificacion-segura.net/login"]:
            self.assertEqual(preprocess(t), "urltok", t)

    def test_correo(self):
        self.assertEqual(preprocess("soporte@banco-seguro.com.bo"), "mailtok")

    def test_telefonos(self):
        for t in ["+591 712-34567", "800 10 2030", "09061701461"]:
            self.assertEqual(preprocess(t), "phonetok", t)

    def test_numeros_cortos(self):
        self.assertEqual(preprocess("Tu código es 482913"), "tu codigo es 0")
        self.assertEqual(preprocess("paga 1,99"), "paga 0,0")

    def test_punto_sin_espacio_no_es_enlace(self):
        self.assertEqual(preprocess("aquí.Gracias"), "aqui.gracias")


class TestInvariancias(unittest.TestCase):
    def test_mayusculas_y_tildes(self):
        self.assertEqual(preprocess("CUÉNTAME AÑO"), preprocess("cuentame ano"))

    def test_caracteres_invisibles(self):
        limpio = "verifique su cuenta"
        for ch in (ZWNJ, ZWSP, BOM, SHY):
            self.assertEqual(preprocess(ch.join("verifique su cuenta")), preprocess(limpio.replace(" ", " ")),
                             f"U+{ord(ch):04X}")

    def test_espacios(self):
        self.assertEqual(preprocess("  hola \n\n  mundo\t"), "hola mundo")
        self.assertEqual(preprocess("hola" + chr(0xA0) + "mundo"), "hola mundo")

    def test_idempotente(self):
        for t in PARITY_CASES:
            once = preprocess(t)
            self.assertEqual(preprocess(once), once, repr(t))

    def test_sin_mayusculas_ni_marcas_en_la_salida(self):
        import unicodedata
        for t in PARITY_CASES:
            out = preprocess(t)
            self.assertEqual(out, out.lower(), repr(t))
            self.assertFalse(any(unicodedata.category(c) in ("Mn", "Cf") for c in out), repr(t))


if __name__ == "__main__":
    unittest.main()
