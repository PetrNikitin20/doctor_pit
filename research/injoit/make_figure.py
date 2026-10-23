from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing,String
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.widgets.markers import makeMarker
from reportlab.graphics import renderPDF
from reportlab.lib import colors
from pathlib import Path
import json
B=Path(__file__).parent;r=json.loads((B/'numerical_results.json').read_text(encoding='utf8'))
pdfmetrics.registerFont(TTFont('ArticleTimes','C:/Windows/Fonts/times.ttf'))
d=Drawing(240,200);plot=LinePlot();plot.x=28;plot.y=38;plot.width=200;plot.height=135
plot.data=[[(x['percent'],x['gain']) for x in r['budgets']]]
plot.xValueAxis.valueMin=0;plot.xValueAxis.valueMax=100;plot.xValueAxis.valueSteps=[0,25,50,75,100]
plot.yValueAxis.valueMin=0;plot.yValueAxis.valueMax=8;plot.yValueAxis.valueSteps=[0,2,4,6,8]
for axis in [plot.xValueAxis,plot.yValueAxis]:axis.labels.fontName='ArticleTimes';axis.labels.fontSize=9
plot.yValueAxis.visibleGrid=True;plot.yValueAxis.gridStrokeColor=colors.Color(.8,.8,.8);plot.yValueAxis.gridStrokeWidth=.3
plot.lines[0].strokeColor=colors.black;plot.lines[0].strokeWidth=1;plot.lines[0].symbol=makeMarker('FilledCircle');plot.lines[0].symbol.size=4
d.add(plot)
d.add(String(28,187,'Уменьшение потерь (усл. ед.)',fontName='ArticleTimes',fontSize=9))
d.add(String(128,10,'Доля двух бюджетов (%)',fontName='ArticleTimes',fontSize=9,textAnchor='middle'))
renderPDF.drawToFile(d,str(B/'budget.pdf'))
