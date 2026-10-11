package org.dynmap.utils;

import java.nio.file.*;
import java.util.*;
import org.dynmap.modsupport.*;
import org.dynmap.renderer.RenderPatchFactory.SideVisible;

/** Compile against Dynmap v3.7-beta-6's actual PatchDefinition and API classes. */
public class DynmapModelRegression {
    static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
    static BlockSide side(String face) {
        return switch (face.charAt(0)) {
            case 'u' -> BlockSide.TOP; case 'd' -> BlockSide.BOTTOM;
            case 'n' -> BlockSide.NORTH; case 's' -> BlockSide.SOUTH;
            case 'w' -> BlockSide.WEST; case 'e' -> BlockSide.EAST;
            default -> throw new IllegalArgumentException(face);
        };
    }
    static PatchDefinition patch(String[] box, String face) {
        double[] start = Arrays.stream(box[0].split("/")).limit(3).mapToDouble(Double::parseDouble).toArray();
        double[] end = Arrays.stream(box[1].split("/")).limit(3).mapToDouble(Double::parseDouble).toArray();
        String[] fields = face.split("/");
        double[] uv = fields.length == 6 ? Arrays.stream(fields).skip(2).mapToDouble(Double::parseDouble).toArray() : null;
        int rotation = fields[0].length() > 1 ? Integer.parseInt(fields[0].substring(1)) : 0;
        PatchDefinition p = new PatchDefinition();
        p.updateModelFace(start, end, side(fields[0]), uv, ModelBlockModel.SideRotation.values()[rotation/90],
            !box[0].endsWith("/false"), Integer.parseInt(fields[1]));
        return p;
    }
    static Map<String, Map<Integer, String>> textures(Path file) throws Exception {
        Map<String, Map<Integer, String>> result = new HashMap<>();
        for (String line : Files.readAllLines(file)) {
            if (!line.startsWith("block:")) continue;
            String key = line.split(",patch")[0].replace("block:", "modellist:");
            Map<Integer, String> mapping = new HashMap<>();
            for (String field : line.split(",")) {
                if (!field.startsWith("patch")) continue;
                String[] parts = field.split("=");
                mapping.put(Integer.parseInt(parts[0].substring(5)), parts[1]);
            }
            result.put(key, mapping);
        }
        return result;
    }
    static double[] texture(PatchDefinition patch, double u, double v, int modifier) {
        SideVisible vis = patch.sidevis;
        double x = vis == SideVisible.TOPFLIP || vis == SideVisible.TOPFLIPHV ? 1-u : u;
        double y = vis == SideVisible.TOPFLIPV || vis == SideVisible.TOPFLIPHV ? v : 1-v;
        return switch (modifier) {
            case 4 -> new double[]{1-y, x};
            case 5 -> new double[]{1-x, 1-y};
            case 6, 17, 18 -> new double[]{y, 1-x};
            case 0, 1, 2 -> new double[]{x, y};
            default -> throw new IllegalArgumentException("Unexpected modifier: " + modifier);
        };
    }
    static void equivalent(PatchDefinition old, PatchDefinition repaired, String oldTexture, String newTexture) {
        String[] a = oldTexture.split(":"), b = newTexture.split(":");
        int oldTile = Integer.parseInt(a[0]), newTile = Integer.parseInt(b[0]);
        check(a[1].equals(b[1]) && oldTile%1000 == newTile%1000, "Texture tile changed");
        check(old.shade == repaired.shade, "Shade changed");
        check(newTile/1000 == switch(oldTile/1000) {case 0 -> 4; case 1 -> 17; case 2 -> 18; default -> -1;},
            "Biome tone lost");
        double[] origin = {repaired.x0, repaired.y0, repaired.z0};
        double[] U = {repaired.xu-repaired.x0, repaired.yu-repaired.y0, repaired.zu-repaired.z0};
        double[] V = {repaired.xv-repaired.x0, repaired.yv-repaired.y0, repaired.zv-repaired.z0};
        double normU = Arrays.stream(U).map(v->v*v).sum(), normV = Arrays.stream(V).map(v->v*v).sum();
        for (double[] sample : new double[][]{{.1,.2},{.25,.75},{.8,.3},{.9,.9}}) {
            double u = old.umin + (old.umax-old.umin)*sample[0], v = old.vmin + (old.vmax-old.vmin)*sample[1];
            double[] point = {old.x0+(old.xu-old.x0)*u+(old.xv-old.x0)*v,
                old.y0+(old.yu-old.y0)*u+(old.yv-old.y0)*v,
                old.z0+(old.zu-old.z0)*u+(old.zv-old.z0)*v};
            double newU = 0, newV = 0;
            for (int i=0;i<3;i++) { newU += (point[i]-origin[i])*U[i]/normU; newV += (point[i]-origin[i])*V[i]/normV; }
            check(newU >= repaired.umin-2e-6 && newU <= repaired.umax+2e-6 &&
                newV >= repaired.vmin-2e-6 && newV <= repaired.vmax+2e-6, "Visible face bounds changed");
            for (int i=0;i<3;i++) check(Math.abs(point[i]-origin[i]-U[i]*newU-V[i]*newV)<2e-6, "Geometry changed");
            double[] oldUV=texture(old,u,v,oldTile/1000), newUV=texture(repaired,newU,newV,newTile/1000);
            for (int i=0;i<2;i++) check(Math.abs(oldUV[i]-newUV[i])<2e-6, "Texture mapping changed");
        }
        double oldNormalX=(old.yu-old.y0)*(old.zv-old.z0)-(old.zu-old.z0)*(old.yv-old.y0);
        double oldNormalY=(old.zu-old.z0)*(old.xv-old.x0)-(old.xu-old.x0)*(old.zv-old.z0);
        double oldNormalZ=(old.xu-old.x0)*(old.yv-old.y0)-(old.yu-old.y0)*(old.xv-old.x0);
        check(oldNormalX*(U[1]*V[2]-U[2]*V[1])+oldNormalY*(U[2]*V[0]-U[0]*V[2])+
            oldNormalZ*(U[0]*V[1]-U[1]*V[0])>0,"Face normal reversed");
    }
    public static void main(String[] args) throws Exception {
        Path original = Path.of(args[0]), repaired = Path.of(args[1]);
        long total=0, rejected=0, preserved=0, stretched=0, unchanged=0;
        for (Path file : Files.list(original).filter(p->p.toString().endsWith("-models.txt")).sorted().toList()) {
            List<String> before=Files.readAllLines(file), after=Files.readAllLines(repaired.resolve(file.getFileName()));
            check(before.size()==after.size(),"Model line count changed: "+file);
            String tx=file.getFileName().toString().replace("-models", "-texture");
            Map<String,Map<Integer,String>> oldTextures=textures(original.resolve(tx)), newTextures=textures(repaired.resolve(tx));
            for (int i=0;i<before.size();i++) {
                String old=before.get(i), next=after.get(i);
                if (old.equals(next) && !old.startsWith("modellist:")) continue;
                if (old.startsWith("modellist:id=%crushing_wheel_controller,")) {
                    check(next.startsWith("# HVCZ:"),"Obsolete block remains");continue;
                }
                String[] oldBoxes=old.split(",box="), newBoxes=next.split(",box=");
                check(oldBoxes.length==newBoxes.length && oldBoxes[0].equals(newBoxes[0]),"Block/state mapping changed");
                for (int k=1;k<oldBoxes.length;k++) {
                    String[] a=oldBoxes[k].split(":"), b=newBoxes[k].split(":");
                    check(a.length==b.length && a[0].equals(b[0]) && a[1].equals(b[1]),"Box geometry changed");
                    for (int j=2;j<a.length;j++) {
                        if (a[j].startsWith("R/")) {check(a[j].equals(b[j]),"Model rotation changed");continue;}
                        total++;PatchDefinition p=patch(a,a[j]), q=patch(b,b[j]);
                        check(q.validate(),"Rejected repaired face: "+file+":"+(i+1));
                        if (p.validate()) {check(a[j].equals(b[j]),"Accepted face modified");unchanged++;continue;}
                        rejected++;
                        String oldTexture=oldTextures.get(oldBoxes[0]).get(p.textureindex), newTexture=newTextures.get(newBoxes[0]).get(q.textureindex);
                        if (p.textureindex!=q.textureindex) {equivalent(p,q,oldTexture,newTexture);preserved++;}
                        else {check(oldTexture.equals(newTexture),"Fallback texture changed");stretched++;}
                    }
                }
            }
        }
        check(total==2408910 && rejected==42700 && preserved==38294 && stretched==4406,"Unexpected repair counts");
        System.out.printf("PASS: %,d faces; %,d valid faces unchanged; %,d exact texture repairs; %,d stretch fallbacks; zero rejected faces%n",total,unchanged,preserved,stretched);
    }
}
