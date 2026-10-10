from oletools.olevba import VBA_Parser
import hashlib,json,sys
outputs=[]
for file in sys.argv[1:]:
    parser=VBA_Parser(file,disable_pcode=True)
    try:
        outputs.append({str(stream):hashlib.sha256(code.encode('utf-8')).hexdigest() for _,stream,name,code in parser.extract_macros()})
    finally:
        parser.close()
print(json.dumps({'moduleCount':len(outputs[0]),'sourcePreserved':outputs[0]==outputs[1], 'changedModules':[s for s in outputs[0] if outputs[0].get(s)!=outputs[1].get(s)]}))
if outputs[0]!=outputs[1]: sys.exit(1)
