/*
Auto-generated by: https://github.com/pmndrs/gltfjsx
Command: npx gltfjsx@6.2.16 .\public\models\table.glb 
*/

import React, { useRef } from "react";
import { useGLTF } from "@react-three/drei";

export function NesTable(props) {
  const { nodes, materials } = useGLTF("./models/nesTable.glb");
  return (
    <group {...props} dispose={null}>
      <mesh
        // receiveShadow
        geometry={nodes.nesTable_basic.geometry}
        material={materials.M_table_basic}
      />
    </group>
  );
}

useGLTF.preload("./models/nesTable.glb");
