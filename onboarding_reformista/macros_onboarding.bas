Attribute VB_Name = "MacrosOnboarding"
Option Explicit

' =========================================================
' ONBOARDING REFORMISTA - Módulo VBA para generar JSON
' =========================================================

' ---------------------------------------------------------
' Utilidades de cadena JSON
' ---------------------------------------------------------
Function Esc(s As String) As String
    Dim r As String
    r = s
    r = Replace(r, "\", "\\")
    r = Replace(r, """", "\""")
    r = Replace(r, Chr(10), "\n")
    r = Replace(r, Chr(13), "")
    r = Replace(r, Chr(9), "\t")
    Esc = r
End Function

Function NumStr(v As Variant) As String
    If IsEmpty(v) Or IsNull(v) Or v = "" Then
        NumStr = "0"
    ElseIf IsNumeric(v) Then
        NumStr = CStr(CDbl(v))
    Else
        NumStr = "0"
    End If
End Function

Function BoolStr(b As Boolean) As String
    If b Then BoolStr = "true" Else BoolStr = "false"
End Function

Function CeldaStr(ws As Worksheet, fila As Integer, col As Integer) As String
    CeldaStr = Trim(CStr(ws.Cells(fila, col).Value))
End Function

Function CeldaNum(ws As Worksheet, fila As Integer, col As Integer) As Double
    Dim v As Variant
    v = ws.Cells(fila, col).Value
    If IsNumeric(v) Then
        CeldaNum = CDbl(v)
    Else
        CeldaNum = 0
    End If
End Function

Function CeldaBool(ws As Worksheet, fila As Integer, col As Integer) As Boolean
    Dim v As String
    v = LCase(Trim(CStr(ws.Cells(fila, col).Value)))
    CeldaBool = (v = "si" Or v = "sí" Or v = "true" Or v = "1" Or v = "yes")
End Function

' ---------------------------------------------------------
' Sección EMPRESA
' ---------------------------------------------------------
Function BuildEmpresa() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("EMPRESA")
    Dim j As String
    j = "{"
    j = j & """nombre"": """ & Esc(CeldaStr(ws, 4, 3)) & ""","
    j = j & """cif"": """ & Esc(CeldaStr(ws, 5, 3)) & ""","
    j = j & """telefono"": """ & Esc(CeldaStr(ws, 6, 3)) & ""","
    j = j & """email"": """ & Esc(CeldaStr(ws, 7, 3)) & ""","
    j = j & """web"": """ & Esc(CeldaStr(ws, 8, 3)) & ""","
    j = j & """ciudad"": """ & Esc(CeldaStr(ws, 9, 3)) & ""","
    j = j & """direccion"": """ & Esc(CeldaStr(ws, 10, 3)) & ""","
    j = j & """nombre_autonomo"": """ & Esc(CeldaStr(ws, 11, 3)) & """"
    j = j & "}"
    BuildEmpresa = j
End Function

' ---------------------------------------------------------
' Sección ACCESO (credenciales del panel admin)
' ---------------------------------------------------------
Function BuildAcceso() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("EMPRESA")
    Dim j As String
    j = "{"
    j = j & """email"": """ & Esc(CeldaStr(ws, 14, 3)) & ""","
    j = j & """password"": """ & Esc(CeldaStr(ws, 15, 3)) & """"
    j = j & "}"
    BuildAcceso = j
End Function

' ---------------------------------------------------------
' Sección MOTOR
' ---------------------------------------------------------
Function BuildMotor() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("MOTOR")
    Dim j As String
    j = "{"
    j = j & """margen_tipo"": """ & Esc(CeldaStr(ws, 4, 3)) & ""","
    j = j & """margen_valor"": " & NumStr(CeldaNum(ws, 5, 3)) & ","
    j = j & """iva"": " & NumStr(CeldaNum(ws, 6, 3)) & ","
    j = j & """minimo"": " & NumStr(CeldaNum(ws, 7, 3)) & ","
    j = j & """validez"": " & NumStr(CeldaNum(ws, 8, 3)) & ","
    j = j & """desplazamiento"": " & NumStr(CeldaNum(ws, 9, 3)) & ","
    j = j & """garantia_mo"": " & NumStr(CeldaNum(ws, 10, 3)) & ","
    j = j & """garantia_mat"": " & NumStr(CeldaNum(ws, 11, 3))
    j = j & "}"
    BuildMotor = j
End Function

' ---------------------------------------------------------
' Sección CALIDAD_COEF
' ---------------------------------------------------------
Function BuildCalidadCoef() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("MOTOR")
    Dim j As String
    j = "{"
    j = j & """basica"": " & NumStr(CeldaNum(ws, 14, 3)) & ","
    j = j & """media"": " & NumStr(CeldaNum(ws, 15, 3)) & ","
    j = j & """premium"": " & NumStr(CeldaNum(ws, 16, 3))
    j = j & "}"
    BuildCalidadCoef = j
End Function

' ---------------------------------------------------------
' Sección PAGO
' ---------------------------------------------------------
Function BuildPago() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("MOTOR")
    Dim j As String
    j = "{"
    j = j & """forma_pago"": """ & Esc(CeldaStr(ws, 19, 3)) & ""","
    j = j & """dias_pago"": " & NumStr(CeldaNum(ws, 20, 3)) & ","
    j = j & """penalizacion_retraso"": " & NumStr(CeldaNum(ws, 21, 3))
    j = j & "}"
    BuildPago = j
End Function

' ---------------------------------------------------------
' Sección ESPACIOS (ids activos + config por espacio)
' ---------------------------------------------------------
Function BuildEspacios() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("ESPACIOS")

    Dim activos As String
    Dim config As String
    activos = "["
    config = "{"
    Dim firstA As Boolean: firstA = True
    Dim firstC As Boolean: firstC = True

    Dim fila As Integer
    fila = 5
    Do While ws.Cells(fila, 2).Value <> ""
        Dim espId As String
        espId = Trim(CStr(ws.Cells(fila, 3).Value))
        If espId = "" Then
            fila = fila + 1
            GoTo ContinueEsp
        End If
        Dim isActivo As Boolean
        isActivo = CeldaBool(ws, fila, 2)

        If isActivo Then
            If Not firstA Then activos = activos & ","
            activos = activos & """" & Esc(espId) & """"
            firstA = False
        End If

        ' Config del espacio
        If Not firstC Then config = config & ","
        config = config & """" & Esc(espId) & """: {"
        config = config & """label"": """ & Esc(Trim(CStr(ws.Cells(fila, 4).Value))) & ""","
        config = config & """emoji"": """ & Esc(Trim(CStr(ws.Cells(fila, 5).Value))) & ""","
        config = config & """m2_defecto"": " & NumStr(ws.Cells(fila, 6).Value) & ","
        config = config & """m2_min"": " & NumStr(ws.Cells(fila, 7).Value) & ","
        config = config & """m2_max"": " & NumStr(ws.Cells(fila, 8).Value) & ","
        config = config & """max_instancias"": " & NumStr(ws.Cells(fila, 9).Value) & ","
        config = config & """activo"": " & BoolStr(isActivo)
        config = config & "}"
        firstC = False

        fila = fila + 1
ContinueEsp:
    Loop

    activos = activos & "]"
    config = config & "}"

    BuildEspacios = """espacios_activos"": " & activos & "," & Chr(10) & "  ""espacios_config"": " & config
End Function

' ---------------------------------------------------------
' Sección TRABAJOS (por espacio)
' ---------------------------------------------------------
Function BuildTrabajos() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("TRABAJOS")

    Dim j As String
    j = "{"
    Dim firstEsp As Boolean: firstEsp = True
    Dim curEsp As String: curEsp = ""
    Dim firstTrab As Boolean: firstTrab = True

    Dim fila As Integer
    fila = 5
    Do While ws.Cells(fila, 3).Value <> "" Or ws.Cells(fila, 4).Value <> ""
        If Not CeldaBool(ws, fila, 1) Then
            fila = fila + 1
            GoTo ContinueTrab
        End If

        Dim espacio As String
        espacio = Trim(CStr(ws.Cells(fila, 3).Value))
        Dim clave As String
        clave = Trim(CStr(ws.Cells(fila, 4).Value))

        If espacio = "" Or clave = "" Then
            fila = fila + 1
            GoTo ContinueTrab
        End If

        If espacio <> curEsp Then
            If curEsp <> "" Then
                j = j & "}"   ' cierra trabajos del espacio anterior
                j = j & "}"   ' cierra espacio
            End If
            If Not firstEsp Then j = j & ","
            j = j & """" & Esc(espacio) & """: {"
            j = j & """trabajos"": {"
            curEsp = espacio
            firstEsp = False
            firstTrab = True
        End If

        If Not firstTrab Then j = j & ","
        j = j & """" & Esc(clave) & """: {"
        j = j & """label"": """ & Esc(Trim(CStr(ws.Cells(fila, 5).Value))) & ""","
        j = j & """unidad"": """ & Esc(Trim(CStr(ws.Cells(fila, 6).Value))) & ""","
        j = j & """mo"": " & NumStr(ws.Cells(fila, 7).Value) & ","
        j = j & """mat"": " & NumStr(ws.Cells(fila, 8).Value) & ","
        j = j & """dias"": " & NumStr(ws.Cells(fila, 9).Value)
        Dim nota As String
        nota = Trim(CStr(ws.Cells(fila, 10).Value))
        If nota <> "" Then
            j = j & ",""nota"": """ & Esc(nota) & """"
        End If
        j = j & "}"
        firstTrab = False

        fila = fila + 1
ContinueTrab:
    Loop

    ' Cierra el último espacio
    If curEsp <> "" Then
        j = j & "}}"
    End If
    j = j & "}"
    BuildTrabajos = j
End Function

' ---------------------------------------------------------
' Sección MATERIALES (productos/catálogo)
' ---------------------------------------------------------
Function BuildMateriales() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("MATERIALES")

    Dim j As String
    j = "["
    Dim first As Boolean: first = True

    Dim fila As Integer
    fila = 5
    Do While ws.Cells(fila, 3).Value <> ""
        If Not CeldaBool(ws, fila, 2) Then
            fila = fila + 1
            GoTo ContinueMat
        End If

        If Not first Then j = j & ","
        j = j & "{"
        j = j & """id"": """ & Esc(Trim(CStr(ws.Cells(fila, 3).Value))) & ""","
        j = j & """cat"": """ & Esc(Trim(CStr(ws.Cells(fila, 4).Value))) & ""","
        j = j & """nombre"": """ & Esc(Trim(CStr(ws.Cells(fila, 5).Value))) & ""","
        j = j & """marca"": """ & Esc(Trim(CStr(ws.Cells(fila, 6).Value))) & ""","
        j = j & """precio"": " & NumStr(ws.Cells(fila, 7).Value) & ","
        j = j & """unidad"": """ & Esc(Trim(CStr(ws.Cells(fila, 8).Value))) & ""","
        j = j & """proveedor"": """ & Esc(Trim(CStr(ws.Cells(fila, 9).Value))) & ""","
        j = j & """visible"": " & BoolStr(CeldaBool(ws, fila, 10))
        j = j & "}"
        first = False

        fila = fila + 1
ContinueMat:
    Loop
    j = j & "]"
    BuildMateriales = j
End Function

' ---------------------------------------------------------
' Sección EXTRAS
' ---------------------------------------------------------
Function BuildExtras() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("EXTRAS")

    Dim j As String
    j = "{"
    Dim first As Boolean: first = True

    Dim fila As Integer
    fila = 5
    Do While ws.Cells(fila, 3).Value <> ""
        If Not CeldaBool(ws, fila, 2) Then
            fila = fila + 1
            GoTo ContinueExtra
        End If

        Dim clave As String
        clave = Trim(CStr(ws.Cells(fila, 3).Value))
        If clave = "" Then
            fila = fila + 1
            GoTo ContinueExtra
        End If

        If Not first Then j = j & ","
        j = j & """" & Esc(clave) & """: {"
        j = j & """label"": """ & Esc(Trim(CStr(ws.Cells(fila, 4).Value))) & ""","
        j = j & """desc"": """ & Esc(Trim(CStr(ws.Cells(fila, 5).Value))) & ""","
        j = j & """icon"": """ & Esc(Trim(CStr(ws.Cells(fila, 6).Value))) & ""","
        j = j & """importe"": " & NumStr(ws.Cells(fila, 7).Value) & ","
        j = j & """dinamico"": " & BoolStr(CeldaBool(ws, fila, 8))
        j = j & "}"
        first = False

        fila = fila + 1
ContinueExtra:
    Loop
    j = j & "}"
    BuildExtras = j
End Function

' ---------------------------------------------------------
' Sección COMUNICACION
' ---------------------------------------------------------
Function BuildComunicacion() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("COMUNICACION")
    Dim j As String
    j = "{"
    j = j & """mensaje_bienvenida"": """ & Esc(CeldaStr(ws, 4, 3)) & ""","
    j = j & """mensaje_presupuesto"": """ & Esc(CeldaStr(ws, 5, 3)) & ""","
    j = j & """whatsapp"": """ & Esc(CeldaStr(ws, 6, 3)) & ""","
    j = j & """color_primario"": """ & Esc(CeldaStr(ws, 7, 3)) & ""","
    j = j & """logo_url"": """ & Esc(CeldaStr(ws, 8, 3)) & """"
    j = j & "}"
    BuildComunicacion = j
End Function

' ---------------------------------------------------------
' Sección ZONA (cobertura geográfica)
' ---------------------------------------------------------
Function BuildZona() As String
    Dim ws As Worksheet
    Set ws = ThisWorkbook.Sheets("ZONA")
    Dim j As String
    j = "{"
    j = j & """radio_km"": " & NumStr(CeldaNum(ws, 4, 3)) & ","
    j = j & """coste_km_adicional"": " & NumStr(CeldaNum(ws, 5, 3)) & ","
    j = j & """municipios"": """ & Esc(CeldaStr(ws, 6, 3)) & """"
    j = j & "}"
    BuildZona = j
End Function

' ---------------------------------------------------------
' FUNCIÓN PRINCIPAL: Genera el JSON completo
' ---------------------------------------------------------
Function GenerarJSON() As String
    Dim j As String
    j = "{" & Chr(10)
    j = j & "  ""empresa"": " & BuildEmpresa() & "," & Chr(10)
    j = j & "  ""acceso"": " & BuildAcceso() & "," & Chr(10)
    j = j & "  ""motor"": " & BuildMotor() & "," & Chr(10)
    j = j & "  ""calidad_coef"": " & BuildCalidadCoef() & "," & Chr(10)
    j = j & "  ""pago"": " & BuildPago() & "," & Chr(10)
    j = j & "  " & BuildEspacios() & "," & Chr(10)
    j = j & "  ""trabajos"": " & BuildTrabajos() & "," & Chr(10)
    j = j & "  ""productos"": " & BuildMateriales() & "," & Chr(10)
    j = j & "  ""extras"": " & BuildExtras() & "," & Chr(10)
    j = j & "  ""comunicacion"": " & BuildComunicacion() & "," & Chr(10)
    j = j & "  ""zona"": " & BuildZona() & Chr(10)
    j = j & "}"
    GenerarJSON = j
End Function

' ---------------------------------------------------------
' SUB: Guarda el JSON en un archivo .json
' ---------------------------------------------------------
Sub GuardarJSON()
    Dim json As String
    On Error GoTo ErrGuardar
    json = GenerarJSON()

    Dim rutaDefault As String
    rutaDefault = ThisWorkbook.Path & "\" & "configuracion_reformista.json"

    ' Mostrar cuadro de diálogo para guardar
    Dim ruta As String
    ruta = Application.GetSaveAsFilename( _
        InitialFileName:=rutaDefault, _
        FileFilter:="Archivos JSON (*.json), *.json", _
        Title:="Guardar configuración del reformista")

    If ruta = "False" Or ruta = "" Then
        MsgBox "Exportación cancelada.", vbInformation
        Exit Sub
    End If

    ' Escribir el archivo
    Dim fileNum As Integer
    fileNum = FreeFile()
    Open ruta For Output As #fileNum
    Print #fileNum, json
    Close #fileNum

    MsgBox "¡JSON guardado correctamente!" & Chr(10) & Chr(10) & _
           "Ruta: " & ruta & Chr(10) & Chr(10) & _
           "Ahora puedes importarlo en el Panel de Administración.", _
           vbInformation, "Exportación completada"
    Exit Sub

ErrGuardar:
    MsgBox "Error al guardar el JSON: " & Err.Description, vbCritical, "Error"
End Sub

' ---------------------------------------------------------
' SUB: Previsualiza el JSON en una hoja temporal
' ---------------------------------------------------------
Sub PreviewJSON()
    Dim ws As Worksheet
    On Error Resume Next
    Set ws = ThisWorkbook.Sheets("JSON_PREVIEW")
    On Error GoTo 0

    If ws Is Nothing Then
        Set ws = ThisWorkbook.Sheets.Add(After:=ThisWorkbook.Sheets(ThisWorkbook.Sheets.Count))
        ws.Name = "JSON_PREVIEW"
    End If

    ws.Cells.Clear
    Dim json As String
    json = GenerarJSON()

    ' Dividir por líneas para mostrar en celdas
    Dim lineas() As String
    lineas = Split(json, Chr(10))
    Dim i As Integer
    For i = 0 To UBound(lineas)
        ws.Cells(i + 1, 1).Value = lineas(i)
    Next i

    ws.Columns(1).ColumnWidth = 120
    ws.Activate
    MsgBox "JSON generado en la hoja JSON_PREVIEW." & Chr(10) & _
           "Para importar, usa el botón 'Guardar JSON'.", vbInformation
End Sub

' ---------------------------------------------------------
' SUB: Navegar a una hoja
' ---------------------------------------------------------
Sub NavTo(sheetName As String)
    ThisWorkbook.Sheets(sheetName).Activate
    ThisWorkbook.Sheets(sheetName).Range("A1").Select
End Sub

Sub IrInicio()       NavTo "INICIO":       End Sub
Sub IrEmpresa()      NavTo "EMPRESA":      End Sub
Sub IrMotor()        NavTo "MOTOR":        End Sub
Sub IrEspacios()     NavTo "ESPACIOS":     End Sub
Sub IrTrabajos()     NavTo "TRABAJOS":     End Sub
Sub IrMateriales()   NavTo "MATERIALES":   End Sub
Sub IrExtras()       NavTo "EXTRAS":       End Sub
Sub IrComunicacion() NavTo "COMUNICACION": End Sub
Sub IrZona()         NavTo "ZONA":         End Sub
Sub IrExportar()     NavTo "EXPORTAR":     End Sub

' ---------------------------------------------------------
' SUB: Validar que los campos obligatorios estén completos
' ---------------------------------------------------------
Sub ValidarFormulario()
    Dim errores As String
    errores = ""

    ' Empresa
    Dim wsE As Worksheet
    Set wsE = ThisWorkbook.Sheets("EMPRESA")
    If Trim(CStr(wsE.Cells(4, 3).Value)) = "" Then errores = errores & "- EMPRESA: Falta el nombre de la empresa" & Chr(10)
    If Trim(CStr(wsE.Cells(7, 3).Value)) = "" Then errores = errores & "- EMPRESA: Falta el email de contacto" & Chr(10)
    If Trim(CStr(wsE.Cells(14, 3).Value)) = "" Then errores = errores & "- EMPRESA: Falta el email de acceso al panel" & Chr(10)
    If Trim(CStr(wsE.Cells(15, 3).Value)) = "" Then errores = errores & "- EMPRESA: Falta la contraseña de acceso" & Chr(10)

    ' Motor
    Dim wsM As Worksheet
    Set wsM = ThisWorkbook.Sheets("MOTOR")
    If CeldaNum(wsM, 5, 3) <= 0 Then errores = errores & "- MOTOR: El margen debe ser mayor que 0" & Chr(10)
    If CeldaNum(wsM, 6, 3) <= 0 Then errores = errores & "- MOTOR: El IVA debe ser mayor que 0" & Chr(10)

    If errores = "" Then
        MsgBox "Validación correcta. El formulario está completo.", vbInformation, "Validación"
    Else
        MsgBox "Se encontraron los siguientes errores:" & Chr(10) & Chr(10) & errores, vbExclamation, "Campos incompletos"
    End If
End Sub
