"""Regenerate the two scientific figures in English from the saved study data."""
from pathlib import Path
import argparse, json, math, subprocess
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.graphics.shapes import Drawing, Rect, String, Line, Polygon
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.widgets.markers import makeMarker
from reportlab.graphics import renderPDF, renderSVG
from reportlab.lib import colors

BASE=Path(__file__).resolve().parent

def build(out, font_path, pdftoppm):
    out.mkdir(parents=True,exist_ok=True)
    pdfmetrics.registerFont(TTFont('ArticleTimesEN',str(font_path)))
    font='ArticleTimesEN'
    def save_vector(d,stem):
        renderPDF.drawToFile(d,str(out/(stem+'.pdf')))
        svg=renderSVG.drawToString(d)
        if isinstance(svg,bytes):svg=svg.decode('utf8')
        (out/(stem+'.svg')).write_text(svg.replace('ArticleTimesEN','Times New Roman'),encoding='utf8')
    def text(d,x,y,s,size=17,anchor='middle'):
        d.add(String(x,y,s,fontName=font,fontSize=size,textAnchor=anchor,fillColor=colors.black))
    def arrow(d,x1,y1,x2,y2):
        d.add(Line(x1,y1,x2,y2,strokeColor=colors.black,strokeWidth=1.2))
        angle=math.atan2(y2-y1,x2-x1)
        d.add(Polygon([x2,y2,x2-8*math.cos(angle-.4),y2-8*math.sin(angle-.4),x2-8*math.cos(angle+.4),y2-8*math.sin(angle+.4)],fillColor=colors.black,strokeColor=colors.black))
    d=Drawing(600,410)
    boxes=[(10,305,['1 Goal setting','and initial assessment']),
           (320,305,['2 Independent hypothesis','and investigation plan']),
           (320,170,['3 Practice with permitted','assistance and reflection']),
           (10,170,['4 Independent assessment','of initial prerequisites']),
           (10,35,['5 Transfer probes','in a new disciplinary context']),
           (320,35,['6 Recommendation and choice','of the next learning activity'])]
    for x,y,lines in boxes:
        d.add(Rect(x,y,270,80,strokeColor=colors.black,fillColor=colors.white,strokeWidth=1))
        for i,line in enumerate(lines):text(d,x+135,y+48-i*24,line)
    for coordinates in [(280,345,320,345),(455,305,455,250),(320,210,280,210),(145,170,145,115),(280,75,320,75)]:arrow(d,*coordinates)
    save_vector(d,'learning_cycle_en')
    r=json.loads((BASE/'simulation_results.json').read_text(encoding='utf8'))
    d=Drawing(600,350)
    plot=LinePlot();plot.x=65;plot.y=75;plot.width=510;plot.height=230
    plot.data=[[(x['k'],100*x['independent']) for x in r['sensitivity']],[(x['k'],100*x['uncertainty']) for x in r['sensitivity']]]
    plot.xValueAxis.valueMin=0;plot.xValueAxis.valueMax=50;plot.xValueAxis.valueSteps=[0,12,24,36,48]
    plot.yValueAxis.valueMin=0;plot.yValueAxis.valueMax=100;plot.yValueAxis.valueSteps=[0,20,40,60,80,100]
    for axis in [plot.xValueAxis,plot.yValueAxis]:
        axis.labels.fontName=font;axis.labels.fontSize=17;axis.strokeColor=colors.black;axis.strokeWidth=1
    plot.yValueAxis.visibleGrid=True;plot.yValueAxis.gridStrokeColor=colors.Color(.8,.8,.8);plot.yValueAxis.gridStrokeWidth=.3
    for i in [0,1]:
        plot.lines[i].strokeColor=colors.black;plot.lines[i].strokeWidth=1.7
        plot.lines[i].symbol=makeMarker('FilledCircle');plot.lines[i].symbol.size=7
        plot.lines[i].symbol.fillColor=colors.black;plot.lines[i].symbol.strokeColor=colors.black
    plot.lines[1].strokeDashArray=[6,4]
    d.add(plot)
    text(d,65,326,'Progression probability, %',17,'start')
    text(d,330,15,'Independent families k per prerequisite')
    d.add(Line(345,330,385,330,strokeWidth=1.7));text(d,395,324,'R₁',17,'start')
    # Separate segments keep the legend dashed in Word's SVG renderer too.
    for start in range(450,490,10):d.add(Line(start,330,start+6,330,strokeWidth=1.7))
    text(d,500,324,'R₂',17,'start')
    save_vector(d,'decision_sensitivity_en')
    for stem in ['learning_cycle_en','decision_sensitivity_en']:
        subprocess.run([str(pdftoppm),'-r','150','-png','-singlefile',str(out/(stem+'.pdf')),str(out/stem)],check=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--output-dir',type=Path,required=True)
    parser.add_argument('--font',type=Path,default=Path('C:/Windows/Fonts/times.ttf'))
    parser.add_argument('--pdftoppm',type=Path,required=True)
    args=parser.parse_args()
    build(args.output_dir,args.font,args.pdftoppm)
