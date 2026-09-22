import AppKit
let output = CommandLine.arguments[1]
let sizes = [(16,1),(16,2),(32,1),(32,2),(128,1),(128,2),(256,1),(256,2),(512,1),(512,2)]
try FileManager.default.createDirectory(atPath: output, withIntermediateDirectories: true)
for (base,scale) in sizes {
    let n = base * scale
    let rep = NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:n,pixelsHigh:n,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:0,bitsPerPixel:0)!
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep:rep)
    let transform=NSAffineTransform();transform.scale(by:CGFloat(n)/1024);transform.concat()
    let background=NSBezierPath(roundedRect:NSRect(x:70,y:70,width:884,height:884),xRadius:200,yRadius:200)
    NSGradient(starting:NSColor(calibratedRed:0.05,green:0.26,blue:0.72,alpha:1),ending:NSColor(calibratedRed:0.25,green:0.67,blue:1,alpha:1))!.draw(in:background,angle:65)
    let left=NSBezierPath();left.move(to:NSPoint(x:244,y:680));left.curve(to:NSPoint(x:490,y:644),controlPoint1:NSPoint(x:340,y:720),controlPoint2:NSPoint(x:425,y:693));left.line(to:NSPoint(x:490,y:339));left.curve(to:NSPoint(x:244,y:375),controlPoint1:NSPoint(x:415,y:388),controlPoint2:NSPoint(x:330,y:405));left.close();NSColor.white.setFill();left.fill()
    let right=NSBezierPath();right.move(to:NSPoint(x:534,y:644));right.curve(to:NSPoint(x:780,y:680),controlPoint1:NSPoint(x:600,y:693),controlPoint2:NSPoint(x:684,y:720));right.line(to:NSPoint(x:780,y:375));right.curve(to:NSPoint(x:534,y:339),controlPoint1:NSPoint(x:694,y:405),controlPoint2:NSPoint(x:609,y:388));right.close();NSColor(calibratedWhite:1,alpha:0.88).setFill();right.fill()
    let label="TEST" as NSString
    let attrs:[NSAttributedString.Key:Any]=[.font:NSFont.systemFont(ofSize:82,weight:.heavy),.foregroundColor:NSColor.white,.kern:10]
    let size=label.size(withAttributes:attrs);label.draw(at:NSPoint(x:(1024-size.width)/2,y:194),withAttributes:attrs)
    NSGraphicsContext.restoreGraphicsState()
    let filename="icon_\(base)x\(base)\(scale==2 ? "@2x" : "").png"
    try rep.representation(using:.png,properties:[:])!.write(to:URL(fileURLWithPath:output).appendingPathComponent(filename))
}
