import { chartCanvas, canvasBytes } from './image';
import { cellText, formatGenerated, type Report } from './report';
import { createZip, escapeXml } from './zip';

// Minimal PresentationML package: one master, one blank layout, a theme, and slides with text, tables and chart images.

const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const P = 'http://schemas.openxmlformats.org/presentationml/2006/main';
const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const SLIDE_W = 12192000;
const SLIDE_H = 6858000;
const EMU = 12700;
const ROWS_PER_SLIDE = 12;
const MAX_COLUMNS = 7;

const emptyTree =
  '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

const run = (
  text: string,
  size: number,
  bold = false,
  color = '000000'
): string =>
  `<a:r><a:rPr lang="en-US" sz="${size * 100}"${bold ? ' b="1"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:rPr><a:t>${escapeXml(text)}</a:t></a:r>`;

const textBox = (
  id: number,
  x: number,
  y: number,
  w: number,
  h: number,
  paragraphs: string[]
): string =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Text ${id}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:noFill/></p:spPr><p:txBody><a:bodyPr wrap="square" rtlCol="0"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paragraphs
    .map((paragraph) => `<a:p>${paragraph}</a:p>`)
    .join('')}</p:txBody></p:sp>`;

const titleBox = (title: string): string =>
  textBox(2, 457200, 228600, SLIDE_W - 914400, 685800, [
    run(title, 26, true, '002F53'),
  ]);

const slideXml = (shapes: string): string =>
  `${XML}<p:sld xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:cSld><p:spTree>${emptyTree}${shapes}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;

const tableFrame = (columns: string[], rows: string[][]): string => {
  const width = SLIDE_W - 914400;
  const colWidth = Math.floor(width / columns.length);
  const rowHeight = 330000;
  const cellXml = (value: string, header: boolean): string =>
    `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p>${run(value.length > 60 ? `${value.slice(0, 57)}...` : value, 11, header)}</a:p></a:txBody><a:tcPr marL="45720" marR="45720" marT="22860" marB="22860">${
      header ? '<a:solidFill><a:srgbClr val="E5E7EB"/></a:solidFill>' : ''
    }</a:tcPr></a:tc>`;
  return `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="3" name="Table"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="457200" y="1066800"/><a:ext cx="${colWidth * columns.length}" cy="${rowHeight * (rows.length + 1)}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid>${columns
    .map(() => `<a:gridCol w="${colWidth}"/>`)
    .join(
      ''
    )}</a:tblGrid><a:tr h="${rowHeight}">${columns.map((column) => cellXml(column, true)).join('')}</a:tr>${rows
    .map(
      (row) =>
        `<a:tr h="${rowHeight}">${row.map((value) => cellXml(value, false)).join('')}</a:tr>`
    )
    .join('')}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`;
};

const picture = (relId: string, width: number, height: number): string => {
  const maxW = SLIDE_W - 914400;
  const maxH = SLIDE_H - 1371600;
  const scale = Math.min(maxW / (width * EMU), maxH / (height * EMU));
  const cx = Math.round(width * EMU * scale);
  const cy = Math.round(height * EMU * scale);
  return `<p:pic><p:nvPicPr><p:cNvPr id="3" name="Chart"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${relId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${Math.round((SLIDE_W - cx) / 2)}" y="1066800"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr></p:pic>`;
};

const THEME = `${XML}<a:theme xmlns:a="${A}" name="Report"><a:themeElements><a:clrScheme name="Report"><a:dk1><a:srgbClr val="000000"/></a:dk1><a:lt1><a:srgbClr val="FFFFFF"/></a:lt1><a:dk2><a:srgbClr val="002F53"/></a:dk2><a:lt2><a:srgbClr val="F3F4F6"/></a:lt2><a:accent1><a:srgbClr val="002F53"/></a:accent1><a:accent2><a:srgbClr val="C5004B"/></a:accent2><a:accent3><a:srgbClr val="4AACC5"/></a:accent3><a:accent4><a:srgbClr val="035D67"/></a:accent4><a:accent5><a:srgbClr val="FE7311"/></a:accent5><a:accent6><a:srgbClr val="3F4FA2"/></a:accent6><a:hlink><a:srgbClr val="0563C1"/></a:hlink><a:folHlink><a:srgbClr val="954F72"/></a:folHlink></a:clrScheme><a:fontScheme name="Report"><a:majorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme><a:fmtScheme name="Report"><a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst><a:lnStyleLst><a:ln w="9525"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="12700"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln><a:ln w="19050"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst><a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst><a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst></a:fmtScheme></a:themeElements></a:theme>`;

const MASTER = `${XML}<p:sldMaster xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"><p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr val="bg1"/></p:bgRef></p:bg><p:spTree>${emptyTree}</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/><p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst><p:txStyles><p:titleStyle><a:lvl1pPr><a:defRPr sz="3200"/></a:lvl1pPr></p:titleStyle><p:bodyStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:bodyStyle><p:otherStyle><a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr></p:otherStyle></p:txStyles></p:sldMaster>`;

const LAYOUT = `${XML}<p:sldLayout xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}" preserve="1"><p:cSld name="Blank"><p:spTree>${emptyTree}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>`;

const rels = (items: { id: string; type: string; target: string }[]): string =>
  `${XML}<Relationships xmlns="${PKG}">${items.map((item) => `<Relationship Id="${item.id}" Type="${R}/${item.type}" Target="${item.target}"/>`).join('')}</Relationships>`;

export const pptxBlob = async (report: Report): Promise<Blob> => {
  const slides: { xml: string; image?: Uint8Array }[] = [];

  const intro: string[] = [
    run(formatGenerated(report), 12, false, '5C6070'),
    '',
  ];
  if (report.subtitle) intro.unshift(run(report.subtitle, 14));
  report.criteria
    .slice(0, 10)
    .forEach((item) => intro.push(run(`• ${item}`, 13)));
  if (report.kpis?.length) {
    intro.push('');
    report.kpis
      .slice(0, 8)
      .forEach((kpi) =>
        intro.push(`${run(`${kpi.label}: `, 14)}${run(kpi.value, 14, true)}`)
      );
  }
  report.notes
    ?.slice(0, 3)
    .forEach((note) => intro.push(run(note, 11, false, '5C6070')));
  slides.push({
    xml: slideXml(
      `${titleBox(report.title)}${textBox(3, 457200, 990600, SLIDE_W - 914400, SLIDE_H - 1371600, intro)}`
    ),
  });

  for (const chart of report.charts ?? []) {
    const canvas = chartCanvas(chart, 1200);
    slides.push({
      xml: slideXml(
        `${titleBox(chart.title)}${picture('rId2', canvas.width, canvas.height)}`
      ),
      image: await canvasBytes(canvas, 'image/png'),
    });
  }

  report.tables.forEach((table) => {
    const columns = table.columns.slice(0, MAX_COLUMNS);
    const pages = Math.max(1, Math.ceil(table.rows.length / ROWS_PER_SLIDE));
    for (let page = 0; page < pages; page += 1) {
      const rows = table.rows
        .slice(page * ROWS_PER_SLIDE, (page + 1) * ROWS_PER_SLIDE)
        .map((row) => columns.map((_, index) => cellText(row[index])));
      const title =
        pages > 1 ? `${table.title} (${page + 1}/${pages})` : table.title;
      const note =
        table.columns.length > MAX_COLUMNS
          ? textBox(4, 457200, SLIDE_H - 500000, SLIDE_W - 914400, 300000, [
              run(
                `Showing ${MAX_COLUMNS} of ${table.columns.length} columns. Use Excel for all columns.`,
                10,
                false,
                '5C6070'
              ),
            ])
          : '';
      slides.push({
        xml: slideXml(
          `${titleBox(title)}${rows.length ? tableFrame(columns, rows) : textBox(3, 457200, 1066800, 6000000, 400000, [run('No rows.', 14)])}${note}`
        ),
      });
    }
  });

  const entries = [
    {
      name: '[Content_Types].xml',
      data: `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>${slides
        .map(
          (_, index) =>
            `<Override PartName="/ppt/slides/slide${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
        )
        .join('')}</Types>`,
    },
    {
      name: '_rels/.rels',
      data: `${XML}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`,
    },
    {
      name: 'ppt/presentation.xml',
      data: `${XML}<p:presentation xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${slides
        .map(
          (_, index) => `<p:sldId id="${256 + index}" r:id="rId${index + 4}"/>`
        )
        .join(
          ''
        )}</p:sldIdLst><p:sldSz cx="${SLIDE_W}" cy="${SLIDE_H}"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`,
    },
    {
      name: 'ppt/_rels/presentation.xml.rels',
      data: rels([
        {
          id: 'rId1',
          type: 'slideMaster',
          target: 'slideMasters/slideMaster1.xml',
        },
        { id: 'rId2', type: 'theme', target: 'theme/theme1.xml' },
        { id: 'rId3', type: 'presProps', target: 'presProps.xml' },
        ...slides.map((_, index) => ({
          id: `rId${index + 4}`,
          type: 'slide',
          target: `slides/slide${index + 1}.xml`,
        })),
      ]),
    },
    {
      name: 'ppt/presProps.xml',
      data: `${XML}<p:presentationPr xmlns:a="${A}" xmlns:r="${R}" xmlns:p="${P}"/>`,
    },
    { name: 'ppt/theme/theme1.xml', data: THEME },
    { name: 'ppt/slideMasters/slideMaster1.xml', data: MASTER },
    {
      name: 'ppt/slideMasters/_rels/slideMaster1.xml.rels',
      data: rels([
        {
          id: 'rId1',
          type: 'slideLayout',
          target: '../slideLayouts/slideLayout1.xml',
        },
        { id: 'rId2', type: 'theme', target: '../theme/theme1.xml' },
      ]),
    },
    { name: 'ppt/slideLayouts/slideLayout1.xml', data: LAYOUT },
    {
      name: 'ppt/slideLayouts/_rels/slideLayout1.xml.rels',
      data: rels([
        {
          id: 'rId1',
          type: 'slideMaster',
          target: '../slideMasters/slideMaster1.xml',
        },
      ]),
    },
    ...slides.flatMap((slide, index) => [
      { name: `ppt/slides/slide${index + 1}.xml`, data: slide.xml },
      {
        name: `ppt/slides/_rels/slide${index + 1}.xml.rels`,
        data: rels([
          {
            id: 'rId1',
            type: 'slideLayout',
            target: '../slideLayouts/slideLayout1.xml',
          },
          ...(slide.image
            ? [
                {
                  id: 'rId2',
                  type: 'image',
                  target: `../media/image${index + 1}.png`,
                },
              ]
            : []),
        ]),
      },
      ...(slide.image
        ? [{ name: `ppt/media/image${index + 1}.png`, data: slide.image }]
        : []),
    ]),
  ];

  return createZip(
    entries,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  );
};
