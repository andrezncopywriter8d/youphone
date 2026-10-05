"use client";
import { Printer } from "lucide-react";
export function PrintButton(){return <button className="btn-primary" onClick={()=>window.print()}><Printer size={17}/>Imprimir etiqueta</button>}
