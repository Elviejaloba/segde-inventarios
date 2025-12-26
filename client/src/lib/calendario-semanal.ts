// Calendario semanal de muestreo para T.Mendoza
// 260 items distribuidos en 14 semanas (Enero 2025 - Abril 2025)

export interface SemanaCalendario {
  mes: string;
  semana: string;
  items: string[];
}

export interface CalendarioSucursal {
  sucursal: string;
  totalItems: number;
  semanas: SemanaCalendario[];
}

export const CALENDARIO_TMENDOZA: CalendarioSucursal = {
  sucursal: "T.Mendoza",
  totalItems: 260,
  semanas: [
    {
        "mes": "ENERO",
        "semana": "3° Semana",
        "items": [
            "TA80800",
            "TA89GP00",
            "TD157",
            "TD39C",
            "TA89",
            "TA11RA",
            "TD2155",
            "TV139",
            "TF172LX",
            "TA56LX00",
            "TV80C",
            "TD39J",
            "TD302SM",
            "TA80300",
            "TD59R",
            "TD2163",
            "TA424P",
            "TV09I"
        ]
    },
    {
        "mes": "ENERO",
        "semana": "4° Semana",
        "items": [
            "TA89G",
            "TV82X",
            "TA11",
            "TD39S",
            "TF172C19",
            "TA611",
            "TA450TX",
            "TD143A",
            "TA421",
            "TV51S06",
            "TA89HX00",
            "TD111M",
            "TA89D300",
            "TA452M",
            "TA00400",
            "TD302X09",
            "TA89R00",
            "TV51S21"
        ]
    },
    {
        "mes": "FEBRERO",
        "semana": "1° Semana",
        "items": [
            "TA86",
            "TA56C",
            "TD67098",
            "TV136P",
            "TCCOMBO29",
            "TA424TF",
            "TA456M04",
            "TA77-3T01",
            "TV51S32",
            "TD301",
            "TF173M",
            "TD37N",
            "TA59N-304",
            "TD143G",
            "TD106-00",
            "PVREM12C",
            "TD141X00",
            "TD37C"
        ]
    },
    {
        "mes": "FEBRERO",
        "semana": "2° Semana",
        "items": [
            "TD09052",
            "TA56E",
            "TC23603",
            "TA451",
            "TF44M",
            "TC23614",
            "TF172C04",
            "TA451S09",
            "TA424R01",
            "TA77-3T21",
            "TA72M01",
            "TA90I10",
            "TA450S09",
            "TD456",
            "TA59N-310",
            "TA72X",
            "TD09054",
            "TA423"
        ]
    },
    {
        "mes": "FEBRERO",
        "semana": "3° Semana",
        "items": [
            "TC23607",
            "TA773J",
            "TA56A",
            "TA82I",
            "TV605TV",
            "TA424F07",
            "TC75S08",
            "TC400R03",
            "PVMD391730",
            "PVREM06P",
            "TC400R19",
            "TC6019",
            "TC75S29",
            "TCCOMBO42",
            "TA422TP",
            "TA80500",
            "TC400R17",
            "TC505T15"
        ]
    },
    {
        "mes": "FEBRERO",
        "semana": "4° Semana",
        "items": [
            "TCCOMBO25",
            "PVFD70040046",
            "TV02X",
            "TA36R",
            "TD37B",
            "PVEO1091V0",
            "TC106G303",
            "TC150C09",
            "TA423T",
            "TA451S12",
            "TA58X",
            "PVPB941000",
            "TD197M-3",
            "TA59N-305",
            "TD36D",
            "PVEE800000",
            "PVFD70040001",
            "TF307"
        ]
    },
    {
        "mes": "MARZO",
        "semana": "1° Semana",
        "items": [
            "PVFD70030009",
            "TC307K04",
            "TA89C00",
            "TV82S",
            "TV09",
            "TA148G",
            "TA81900",
            "TA451T",
            "TD106M",
            "TF112L",
            "TF61M",
            "TD36TM",
            "TD197M",
            "TD36V",
            "TD107S",
            "TA11PM",
            "TA008T00",
            "TA73"
        ]
    },
    {
        "mes": "MARZO",
        "semana": "2° Semana",
        "items": [
            "TA56X",
            "TA01B00",
            "TA56LF11",
            "TA59N-303",
            "TD89G-300",
            "TA456M09",
            "TA610",
            "TA138G",
            "TA77-1T00",
            "TA77-3T07",
            "TA77-3R29",
            "TA424BF07",
            "TD09029",
            "TA77-3T00",
            "TA59N",
            "TA77-3R03",
            "TA454T",
            "TA605LX"
        ]
    },
    {
        "mes": "MARZO",
        "semana": "3° Semana",
        "items": [
            "TD09022",
            "TA451S03",
            "TD106G-3",
            "TC307K02",
            "TV02M",
            "TA58E",
            "TD09012",
            "TA170S00",
            "TV425L",
            "TV51S10",
            "TD156B",
            "TV400TR",
            "TD36MX03",
            "PVEO0105B0",
            "PVEO107605",
            "PVIN0194B0",
            "TV83",
            "TA68X"
        ]
    },
    {
        "mes": "MARZO",
        "semana": "4° Semana",
        "items": [
            "TV82SM",
            "TA60",
            "TV82M",
            "TV215",
            "TA56LF07",
            "TA82F",
            "TV04M",
            "TC605LX04",
            "PVEO107A5",
            "TC605LX01",
            "TC605M15",
            "TA82PT03",
            "PVEO202",
            "TA82PT16",
            "TA82PT04",
            "PV750500",
            "PVEO201L",
            "PVEO200"
        ]
    },
    {
        "mes": "ABRIL",
        "semana": "1° Semana",
        "items": [
            "PVFD70040015",
            "PVFD70000059",
            "TC195OT13",
            "TC40015",
            "PVFD700000",
            "PVFD70040061",
            "PVIN0745B0",
            "TC195M19",
            "TC605M21",
            "PVMD391620",
            "TA82PT05",
            "PVFD006300",
            "PVFD70000001",
            "TD39",
            "TA56L",
            "TA82KM",
            "TA57L",
            "TV84C",
            "TV451F",
            "TA67L"
        ]
    },
    {
        "mes": "ABRIL",
        "semana": "2° Semana",
        "items": [
            "TF166A",
            "TA194M00",
            "TV51S01",
            "TA170",
            "TA450T",
            "TA170C",
            "TC400I00",
            "TA424R05",
            "TA451S11",
            "TC510T00",
            "TA451S19",
            "TV82UV",
            "TA451S04",
            "TF147BX",
            "TC150C32",
            "TC400TX00",
            "TV80M",
            "TF166L",
            "TV139F",
            "TF34RLX"
        ]
    },
    {
        "mes": "ABRIL",
        "semana": "3° Semana",
        "items": [
            "TF165",
            "TF70T",
            "TV84S",
            "TF172L",
            "TA58I",
            "TV84B",
            "TA56LF03",
            "TD38",
            "TA400TX00",
            "TA452T",
            "TV215E",
            "TV82T",
            "TA456T",
            "TF61T",
            "TA56LF06",
            "TA424F13",
            "TA72M05",
            "TA57LC",
            "TF172P05",
            "TA56LF05"
        ]
    },
    {
        "mes": "ABRIL",
        "semana": "4° Semana",
        "items": [
            "TA75L",
            "TA75L00",
            "TA424BF03",
            "TV160",
            "TA56LF01",
            "TA82KX00",
            "TA451S14",
            "TF172P01",
            "TF61ML",
            "TF150B",
            "TF44LA",
            "TD199",
            "TA453T",
            "TF307S",
            "TD38X00",
            "TA70SF",
            "TA70KF07",
            "TF72R",
            "TA66L",
            "TF147-3"
        ]
    }
]
};

// Función para obtener la semana actual según la fecha
export function getSemanaActual(): { mes: string; semana: string } | null {
  const hoy = new Date();
  const año = hoy.getFullYear();
  const mes = hoy.getMonth(); // 0-11
  const dia = hoy.getDate();
  
  // Calcular número de semana del mes (1-4)
  const primerDiaMes = new Date(año, mes, 1);
  const diaSemana = primerDiaMes.getDay(); // 0=Dom, 1=Lun...
  const semanaNum = Math.ceil((dia + diaSemana) / 7);
  const semanaStr = semanaNum === 1 ? "1° Semana" : 
                    semanaNum === 2 ? "2° Semana" : 
                    semanaNum === 3 ? "3° Semana" : "4° Semana";
  
  const meses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", 
                 "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
  
  return { mes: meses[mes], semana: semanaStr };
}

// Calendario T.Sjuan - 244 items (Enero 2025 - Abril 2025)
export const CALENDARIO_TSJUAN: CalendarioSucursal = {
  sucursal: "T.Sjuan",
  totalItems: 244,
  semanas: [
    {
        "mes": "ENERO",
        "semana": "3° Semana",
        "items": ["ME18109", "TV06X", "ME221781", "TA11E", "ME1941", "TA11", "ME19406", "TD2135", "ME38346", "TD39C", "BL8000", "BL7505C00", "ME2838", "ME2132", "ME3992", "ME298", "OT7025M00"]
    },
    {
        "mes": "ENERO",
        "semana": "4° Semana",
        "items": ["BL719500", "BL7198M00", "BL7045S00", "PVREM06P", "TC605LX16", "ME11690", "ARACQUACAR120", "BL8021-00", "TC6019", "TC400R17", "ARSUEÑITOS", "BL544C-3", "BL7118B01", "BL7198V00", "BL7219P00", "SI6817", "OT05M00"]
    },
    {
        "mes": "FEBRERO",
        "semana": "1° Semana",
        "items": ["ME1165", "TD302SM", "TA1240", "ME24216", "TA89", "TA89C00", "OT05M16", "ME192019", "TD37S", "OT3702600", "BL7115L00", "ME11700", "ME27", "ME16103", "BL556-100", "BL7047I00", "BL7383BM00"]
    },
    {
        "mes": "FEBRERO",
        "semana": "2° Semana",
        "items": ["ME19205", "ME19207", "ME19209", "TC506M08", "BL7017L00", "ME1111", "ME16105", "TC400R19", "TV605TV", "TD111M", "BL080100", "BL544M-200", "BL701200", "BL7114CX00", "BL7118B14", "SI6818", "TA454T"]
    },
    {
        "mes": "FEBRERO",
        "semana": "3° Semana",
        "items": ["TA456M04", "BL558-200", "BL7009K00", "BL7055G00", "BL7222A00", "BL8D-300", "ME19411", "TA118S09", "TD09027", "TD37B", "ARACQUA500", "ARWAN120", "ARWANTED-60M120", "BL35022", "BL544C-00", "BL556-300", "BL61300"]
    },
    {
        "mes": "FEBRERO",
        "semana": "4° Semana",
        "items": ["BL6546MC00", "BL7010G00", "BL7014H", "BL711100", "BL7198200", "ME1115", "ME2144", "ME221765", "ME33174", "TD36D", "TF169P", "TF61M", "TF112L", "ME16326", "TA01B00", "ME266", "TA11PM"]
    },
    {
        "mes": "MARZO",
        "semana": "1° Semana",
        "items": ["TA56X", "OT003M26", "ME1972", "OT05M06", "ME2121", "OT05M01", "ME194717", "OT003M67", "TA73", "OT05M09", "ME3993", "OT05M07", "BL711000", "ME39911", "OT003M34", "OT003M10", "OT003M22"]
    },
    {
        "mes": "MARZO",
        "semana": "2° Semana",
        "items": ["OT003M54", "BL7007I00", "BL544MF-200", "ME3998", "OT003M62", "ME542", "TA56LF02", "BL7045S03", "OT003M94", "ME161617", "OT003M69", "BL8-100", "OT003M33", "OT003M41", "OT003M50", "TA137R00", "TM40F"]
    },
    {
        "mes": "MARZO",
        "semana": "3° Semana",
        "items": ["ME163132", "BL7047P-100", "TD36TM00", "TV80E", "ME163133", "BL544E-200", "BL003KE", "OT003B00", "ME3834", "OT05M05", "BL544E-100", "BL7111", "BL719700", "BL67099F", "BL7008A00", "BL080300", "BL544MF-300", "BL7383P00"]
    },
    {
        "mes": "MARZO",
        "semana": "4° Semana",
        "items": ["BL8V-100", "BL8V-200", "OT05M03", "BL701000", "BL7019H00", "BL706900", "BL8000MF00", "PVPB919600", "ME1934", "TA77-1T00", "TA138G", "TA605S", "TD195OT", "BL556-200", "TA605LX", "TA82PT21", "OT003M60", "OT003M39"]
    },
    {
        "mes": "ABRIL",
        "semana": "1° Semana",
        "items": ["BL8E-200", "OT003M25", "OT003M83", "OT003M63", "OT003M37", "OT003M38", "OT003M19", "TC195M01", "OT003M79", "OT05M04", "OT003M28", "TA170C", "TC40003", "TD09012", "PVPB730900", "ME1611", "TV102L", "ME1888"]
    },
    {
        "mes": "ABRIL",
        "semana": "2° Semana",
        "items": ["ME18810", "ME19537", "TA56LF07", "TA77-3T11", "TC605LX01", "TC605LX04", "ME19102", "BL7018X00", "ME1119", "TC81M04", "ME18510", "ME1859", "PV750500", "TA82F", "TC605M21", "TC150C03", "TC40015", "TV84C"]
    },
    {
        "mes": "ABRIL",
        "semana": "3° Semana",
        "items": ["TA56L", "TV456M00", "TV51S01", "TC510L00", "TC400I00", "TC505X09", "TC400TX00", "BL7104-400", "TC30T15", "TC150C32", "BL7115M00", "TC40001", "BL7383C-00", "BL557-200", "TA89D00", "BL60400", "BL704000", "BL7313N00"]
    },
    {
        "mes": "ABRIL",
        "semana": "4° Semana",
        "items": ["TV80M", "TV84S", "TV139F", "TF61T", "TF166M", "TA56LF03", "TV103", "TF44KM", "TA77-3S00", "TA452T", "BL61700", "TA605V", "TA70KF07", "BL67100V15", "BL67100V10", "TA72RJ00", "TA70MF", "BL89AT00"]
    }
  ]
};

export const CALENDARIO_TLUIS: CalendarioSucursal = {
  sucursal: "T.SLuis",
  totalItems: 169,
  semanas: [
    {
        "mes": "ENERO",
        "semana": "3° Semana",
        "items": ["BL710100", "TF61M", "TF112L", "TD36TM", "BL54X-100", "TA56L", "TA11PM", "TA58E", "TF165", "TV103", "TV84S", "TV84C", "TA137R00", "TA170S00", "OT003M38", "TA73"]
    },
    {
        "mes": "ENERO",
        "semana": "4° Semana",
        "items": ["TF166A", "TF307S", "TA605LX", "TV139F", "BL704400", "TD195OT", "TD197M", "TF61T", "TD2163", "TA70SF", "TV51S01", "TC507M00", "TV80M", "TA148J", "TF72R", "TA008T00", "TA400TX00"]
    },
    {
        "mes": "FEBRERO",
        "semana": "1° Semana",
        "items": ["TF166L", "TA56LF06", "TA77-3T11", "BL54E-100", "TV84B", "TD39C", "TA451S03", "OT003M39", "TV80C", "TA01B00", "TF172L", "BL8000", "OT05M09", "TA56LF08", "OT003M66", "TA424P", "BL544MF-200"]
    },
    {
        "mes": "FEBRERO",
        "semana": "2° Semana",
        "items": ["BL719600", "OT003M68", "TA82F", "BL7007I00", "TV450L", "TD2135", "OT003M50", "TD106G", "TA456T", "BL54E-200", "TD09012", "TF44KM", "BL7045S03", "TA451S09", "TA53L", "BL7505C00", "BL8-100"]
    },
    {
        "mes": "FEBRERO",
        "semana": "3° Semana",
        "items": ["OT05M01", "TD106G-3", "OT003M19", "TA451S04", "BL7108-200", "TA70S", "TA89R00", "BL7039", "OT003M02", "OT003M10", "OT003M69", "TC605LX04", "OT003M83", "TD2155", "TA82PT00", "BL8P", "OT003M87"]
    },
    {
        "mes": "FEBRERO",
        "semana": "4° Semana",
        "items": ["BL3600500", "BL7198M00", "BL8000E", "OT003M01", "OT003M22", "OT003M54", "OT003M67", "TA450T", "BL8E-200", "OT003M33", "BL7090", "TA451S12", "BL7114R00", "BL7119X", "BL7198P00", "BL7198V00", "BL8I-200"]
    },
    {
        "mes": "MARZO",
        "semana": "1° Semana",
        "items": ["TA77-3T27", "TV451F", "BL542M-200", "BL7019M00", "BL7108-400", "BL719500", "PVREM06P", "TC6019", "TF169P", "OT003M14", "OT003M25", "OT003M32", "OT003M75", "OT003M77", "OT003M96", "PVREM05P", "TC6029"]
    },
    {
        "mes": "MARZO",
        "semana": "2° Semana",
        "items": ["TA56LX00", "BL67100V04", "BL7108-300", "TC6027", "TC605LX16", "TA451S11", "BL700600", "BL7108-100", "PVPB730900", "BL54X-200", "BL67100V10", "OT003M94", "OT05M07", "TC400TX00", "TA451S19", "BL540-104", "BL7047P-100"]
    },
    {
        "mes": "MARZO",
        "semana": "3° Semana",
        "items": ["BL7054R00", "OT003M76", "TD67098", "TF62M", "TA58I", "TD36TM00", "TA148G", "TD89G-300", "BL7045S01", "BL54A-200", "BL544MF-100", "BL003KE", "BL544CF3", "BL7016X200", "BL7016200", "BL7018H00", "BL8000M"]
    },
    {
        "mes": "MARZO",
        "semana": "4° Semana",
        "items": ["OT003B00", "TA09023", "TA452T", "OT05M05", "TD09027", "TV82M", "TA77-3S00", "TA72RJ00", "TD37C", "TA170", "TD302SM", "BL54A-100", "TV450", "BL35024", "BL60200", "BL7045S02", "BL7045S04"]
    }
  ]
};

export const CALENDARIO_CRISA2: CalendarioSucursal = {
  sucursal: "Crisa2",
  totalItems: 410,
  semanas: [
    {
        "mes": "ENERO",
        "semana": "1° Semana",
        "items": ["TV84Z", "TV19L", "TV76R", "TF112N", "TD85S", "TA36Z", "TV85B", "TA76S", "TF62L00", "TF25F", "TV84P", "TF307SD", "TV85P", "TV18S", "TF46C", "TCCOMBO18", "TF44D", "TF44P", "TV136P", "TCCOMBO19", "TV76D", "TF147MR09", "TA72M32", "TA76F", "TV74S"]
    },
    {
        "mes": "ENERO",
        "semana": "2° Semana",
        "items": ["TF215V", "TA451L02", "TD95L", "TV76G", "OT003M98", "TV444P", "TA138C", "TA08008", "TF61M", "TF112LP", "TF61C", "TF112L", "TF112M", "TD36V", "TA16", "OT003B00", "TA01B00", "TA56LF02", "TA56LF04", "TA137R00", "TA73", "TA11PM", "TA008T00", "TA56LF11", "TA452T"]
    },
    {
        "mes": "FEBRERO",
        "semana": "1° Semana",
        "items": ["TV400L", "OT003M54", "OT003M87", "OT003M94", "OT003M14", "OT003M33", "OT05M07", "OT003M32", "OT003M26", "TV80P", "TF147MT", "TA77-3T04", "TA77-3T00", "TA82PT21", "TA166AS", "TV400R", "TA139V00", "TA02B", "OT003M96", "OT003M63", "OT003M64", "TA451S05", "TA82PT00", "TD19B", "TD156B"]
    },
    {
        "mes": "FEBRERO",
        "semana": "2° Semana",
        "items": ["TA170S00", "TV400TR", "TA139S05", "TA139S04", "TA58E", "TA605D", "TA139S19", "TA139S10", "TV136J", "TF34RL", "TA82G", "TA56LF07", "TCCOMBO17", "TA82F", "TA82PT16", "TA82PT03", "TCCOMBO15", "TCCOMBO14", "TA82PT05", "TA170C", "TA57L", "TA67L", "TA56L", "TV84C", "TA194M00"]
    },
    {
        "mes": "FEBRERO",
        "semana": "3° Semana",
        "items": ["TV51S29", "TV451F", "TA170", "TV82UV", "TA424R05", "TA451S07", "TF147I-3", "TF112P", "TF34RS", "TF61T", "TF177S", "TF173L", "TF307SB00", "TA166K", "TF165", "TA53L", "TF147G", "TF47M", "TF166T", "TV139F", "TF169T", "TF34RLX", "TF146L", "TF173M", "TF112TX"]
    },
    {
        "mes": "FEBRERO",
        "semana": "4° Semana",
        "items": ["TV84S", "TF147B", "TF307L", "TF166L", "TF166", "TA36A", "TF146S", "TF172L", "TF166TL", "TV57LV", "TA23P", "TA170L", "TF44KM", "TF215B", "TF166M", "TF45M", "TV02R", "TA86C", "TF70T", "TF112SG", "TF147M", "TF307SB03", "TF44G", "TF61S", "TV61MD"]
    },
    {
        "mes": "MARZO",
        "semana": "1° Semana",
        "items": ["TA57LC", "TF112SP", "TV52S", "TF71L", "TF146B", "TA56LC", "TF44LA", "TF62S", "TA75L", "TF61L", "TA56LF01", "TF169", "TF132", "TF34E", "TV84B", "TF44R", "TA56LF03", "TV215E", "TF61ML", "TA01B200", "TV103", "TF48S", "TF72", "TF132M", "TF215P", "TF132S"]
    },
    {
        "mes": "MARZO",
        "semana": "2° Semana",
        "items": ["TA170T02", "TF307SB02", "TF307A04", "TV23M", "TA125000", "TV85M", "TV451UV", "TV444S", "TF442", "TF61D", "TF47S03", "TV82T", "TF177SM", "TF34R", "TF307A17", "TF70L", "TA58I", "TF49", "TF147MR05", "TV83L", "TV85F03", "TF169P", "TF62A", "TF307A13", "TF147VX", "TF307SB17"]
    },
    {
        "mes": "MARZO",
        "semana": "3° Semana",
        "items": ["TF112C", "TF216M", "TV85F05", "TF161", "TF307SB10", "TF72B", "TA400TX00", "TV85F08", "TF307A10", "TF44V", "TF307SB27", "TA170T08", "TF150B", "TA56LF05", "TA67", "TA02I", "TF307SB13", "TA90J", "TF62F", "TF152L", "TA331E", "TA56LF14", "TF307SB29", "TF71M", "TF136R", "TF307"]
    },
    {
        "mes": "MARZO",
        "semana": "4° Semana",
        "items": ["TF307SB09", "TF44S", "TA126000", "TF147LS", "TA73J11", "TF71S", "TA56LF32", "TF307SB08", "TF112R", "TF177M", "TF177B", "TF112-3", "TF307A03", "TF147V", "TA56LF08", "TF307A14", "TF147P", "TV451V", "TV85F11", "TA156A", "TF44C", "TV85C", "TF34RX", "TF47S05", "TF44B", "TF53C"]
    },
    {
        "mes": "ABRIL",
        "semana": "1° Semana",
        "items": ["TA58IL09", "TF147BS27", "TV165L", "TV460", "TF34C", "TD38", "TV102", "TF307SB07", "TV85L", "TF61G", "TV85F02", "TA82KX00", "TF17", "TF307SB12", "TF178", "TF216I", "TF307SB11", "TV51S17", "TF47S19", "TF34RB", "TV450", "TF61B", "TV83UV", "TF307A29", "TF72RF", "TF63S"]
    },
    {
        "mes": "ABRIL",
        "semana": "2° Semana",
        "items": ["TF147Y", "TF307SB21", "TA56LF09", "TF215S", "TF70E", "TA139P", "TF307SB06", "TD195OT", "TF47S00", "TA424F13", "TF44KA", "TA450B00", "TF307SB04", "TF166TB", "TD841070011", "TF47S32", "TA84B00", "TA36", "TF188H09", "TF47S01", "TF112C1", "TA66X", "TF47SR03", "TV160", "TD156M", "TF112FA"]
    },
    {
        "mes": "ABRIL",
        "semana": "3° Semana",
        "items": ["TA56LG", "TF188H11", "TA81-00", "TF62K05", "TF178S", "TF47S10", "TA72RJ05", "TF47S08", "TF178M00", "TF216L", "TF307E00", "TA98F00", "TF307A15", "TF45", "TF215L", "TF72F", "TF161L", "TA56LF19", "TF47S16", "TD84000019", "TF188H04", "TF47S07", "TF112TE09", "TF147E", "TA451L05", "TA451L19"]
    },
    {
        "mes": "ABRIL",
        "semana": "4° Semana",
        "items": ["TF216E", "TA72M07", "TF308S00", "TD302J", "TF215R", "TF112S", "TF147VD", "TV400TL05", "TF47S13", "TF177V03", "TF176P07", "TF62SP", "TV400LS", "TF47S14", "TF47SR30", "TF176P04", "TA82PT17", "TV160M", "TA82O05", "TD199", "TA424BF03", "TF47SR10", "TF307A07", "TF170J", "TF61F", "TF47SR29"]
    },
    {
        "mes": "MAYO",
        "semana": "1° Semana",
        "items": ["TA82KT05", "TA90I32", "TA36C", "TF49S", "TF136N3", "TF147PL", "TF188H07", "TF181L", "TA82KT04", "TF172P04", "TF44LY", "TF71B", "TF174", "TF177ST04", "TA170T07", "TA77-3S00", "TF132T", "TF161M", "TA82I", "TF188P", "TA456T", "TA72M05", "TF45GL", "TF169M", "TV19P", "TA66S"]
    },
    {
        "mes": "MAYO",
        "semana": "2° Semana",
        "items": ["TF169-3", "TV18G", "TF188H05", "TV51S16", "TA451S29", "TF169B", "TF161A", "TA90I04", "TF47S21", "TF147BS03", "TA72RJ08", "TF62B", "TA170T05", "TF147BS07", "TA453T", "TA139M00", "TA77-1M09", "TD84090109", "TF800", "TF44BC", "TF307S", "TF72R", "TA35M", "TA72RJ00", "TA70KF07", "TF147-3"]
    }
  ]
};

// Obtener el calendario por sucursal
export function getCalendarioSucursal(sucursalId: string): CalendarioSucursal | null {
  switch (sucursalId) {
    case "T.Mendoza":
      return CALENDARIO_TMENDOZA;
    case "T.Sjuan":
      return CALENDARIO_TSJUAN;
    case "T.SLuis":
      return CALENDARIO_TLUIS;
    case "Crisa2":
      return CALENDARIO_CRISA2;
    default:
      return null;
  }
}

