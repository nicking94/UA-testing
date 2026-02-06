"use client";
import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  useTheme,
  Link,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { AuthData } from "../lib/types/types";
import Image from "next/image";
import Logo from "@/public/logo.png";
import Input from "./Input";
import Button from "./Button";

interface AuthFormProps {
  type?: "login" | "register";
  onSubmit: (data: AuthData) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({
  type = "login",
  onSubmit,
}) => {
  const [formData, setFormData] = useState<AuthData>({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const theme = useTheme();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleClickShowPassword = () => setShowPassword((show) => !show);

  return (
    <Paper
      component="form"
      onSubmit={handleSubmit}
      elevation={8}
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        width: { xs: "90%", sm: "70%", md: "35%", xl: "25%" },
        p: 5,
        gap: 2,
        backgroundColor: "#e0f2fe",
        color: "#374151",
        zIndex: 40,
        borderRadius: 2,
      }}
    >
      <Box sx={{ display: "none", justifyContent: "center" }}>
        <Image src={Logo} alt="logo" width={100} height={100} />
      </Box>
      <Typography
        variant="h4"
        component="h2"
        sx={{
          fontWeight: 600,
          textAlign: "center",
          color: "#374151",
          fontSize: { xs: "1.875rem", lg: "2.25rem" },
        }}
      >
        {type === "login" ? "Iniciar sesión" : "Registrarse"}
      </Typography>
      <Input
        label="Usuario"
        name="username"
        value={formData.username}
        onChange={(value) =>
          setFormData({ ...formData, username: value.toString() })
        }
        placeholder="Escribe tu nombre de usuario"
        fullWidth
        required
        capitalize={false}
      />
      <Input
        label="Contraseña"
        name="password"
        type={showPassword ? "text" : "password"}
        value={formData.password}
        onChange={(value) =>
          setFormData({ ...formData, password: value.toString() })
        }
        placeholder="Escribe tu contraseña"
        fullWidth
        required
        buttonIcon={showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
        onButtonClick={handleClickShowPassword}
        buttonTitle={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        capitalize={false}
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
        <Button
          type="submit"
          variant="contained"
          fullWidth
          text={type === "login" ? "Iniciar Sesión" : "Registrarse"}
          isPrimaryAction={true}
          size="medium"
          sx={{
            "&.Mui-disabled": {
              backgroundColor: theme.palette.action.disabledBackground,
              color: theme.palette.action.disabled,
            },
          }}
        />
        
        <Typography 
          variant="caption" 
          align="center" 
          sx={{ color: "text.secondary", fontSize: "0.7rem", lineHeight: 1.2 }}
        >
          Al iniciar sesión, aceptas nuestros{' '}
          <Link
            href="/terminos-y-condiciones"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: theme.palette.primary.main,
              textDecoration: "none",
              fontWeight: "bold",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            Términos y Condiciones
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
};

export default AuthForm;