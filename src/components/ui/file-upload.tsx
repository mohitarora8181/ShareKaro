'use client';

import { cn } from "@/@/lib/utils";
import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { IconUpload } from "@tabler/icons-react";
import { useDropzone } from "react-dropzone";
import { gsap } from 'gsap';
import supabase from "@/@/lib/client";
import QRCode from 'qrcode';
import { Flip, toast } from "react-toastify";
import CryptoJS from 'crypto-js';



const mainVariant = {
    initial: {
        x: 0,
        y: 0,
    },
    animate: {
        x: 20,
        y: -20,
        opacity: 0.9,
    },
};

const secondaryVariant = {
    initial: {
        opacity: 0,
    },
    animate: {
        opacity: 1,
    },
};

export const FileUpload = () => {
    const [files, setFiles] = useState<File[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLDivElement>(null);
    const [qrCode, setQrCode] = useState('');
    const [fileLink, setFileLink] = useState('');

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (newFiles: File[], e: any) => {

        const acceptedFileTypes = ['*'];
        const maxFileSize = 5 * 1024 * 1024;

        const validFiles = newFiles.filter(file => {
            if (!acceptedFileTypes.includes(file.type)) {
                console.error(`Unsupported file type: ${file.type}`);
                return false;
            }
            if (file.size > maxFileSize) {
                console.error(`File size exceeds limit: ${file.name} (${file.size / (1024 * 1024)} MB)`);
                return false;
            }
            return true;
        });

        if (validFiles.length === 0) {
            console.warn("No valid files to upload.");
            return;
        }


        setFiles((prevFiles) => [...prevFiles, ...newFiles]);

        for (const file of newFiles) {
            const timestamp = Date.now();
            const uniqueFileName = `public/${timestamp}_${file.name}`

            const encryptedBlob = await file.arrayBuffer().then((buffer) => {
                const encryptedData = CryptoJS.AES.encrypt(CryptoJS.lib.WordArray.create(buffer), process.env.NEXT_PUBLIC_ENCRYPTION_KEY!);
                return new Blob([encryptedData.toString()], { type: file.type });
            });

            const { data, error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(`${uniqueFileName}`, encryptedBlob);

            if (uploadError) {
                console.error('Error uploading file:', uploadError.message);
                continue;
            }

            console.log('File Uploaded Successfully', data);
            const uniqueID = generateUniqueId();

            const fileUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}file/${uniqueID}`;

            const { error: dbError } = await supabase
                .from('uploads')
                .insert([
                    {
                        id: uniqueID,
                        file_name: file.name,
                        file_size: file.size,
                        file_type: file.type,
                        file_path: `/storage/v1/object/public/uploads/${uniqueFileName}`,
                        created_at: new Date().toISOString(),
                    },
                ]);

            if (dbError) {
                console.error('Error storing file metadata:', dbError.message);
            } else {
                console.log('File metadata stored successfully:', { name: file.name, url: fileUrl });
            }

            await generateQrCode(fileUrl);
            console.log("qr code generated");
        }
    };

    const generateQrCode = async (url: string) => {
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(url);
            setQrCode(qrCodeDataUrl);
            setFileLink(url);
            fileInputRef?.current?.setAttribute("disabled", "true");

        } catch (error) {
            console.error("Error generating QR code", error);
        }
    };


    function generateUniqueId() {
        return Array.from({ length: 6 }, () => {
            const randomChar = Math.floor(Math.random() * 62);
            return randomChar < 10
                ? String.fromCharCode(randomChar + 48)
                : randomChar < 36
                    ? String.fromCharCode(randomChar + 87)
                    : String.fromCharCode(randomChar + 29);
        }).join('');
    }


    useEffect(() => {
        if (fileRef.current) {
            gsap.to(fileRef.current, {
                rotate: 720,
                color: "#000000",
                yoyo: true,
                duration: 2,
                scale: 1,
                stagger: 0.2,
                rotateY: 180,
                attr: { d: "M10 10 H 90 V 90 H 10 L 10 10" },
                ease: "Power1.inOut"
            });
        }
    }, []);

    const { getRootProps, isDragActive } = useDropzone({
        multiple: false,
        noClick: true,
        onDrop: handleFileChange,
        onDropRejected: (error) => {
            console.log(error);
        },
    });

    return (
        <div className="w-full" {...getRootProps()}>
            <motion.div
                onClick={handleClick}
                whileHover="animate"
                className="p-10 group/file block rounded-lg cursor-pointer w-full relative overflow-hidden"
            >
                <input
                    ref={fileInputRef}
                    id="file-upload-handle"
                    type="file"
                    onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        console.log("File selected:", files);
                        handleFileChange(files, e);
                    }}
                    className="hidden"
                />
                <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent)]">
                    {/* <GridPattern /> */}
                </div>


                <div className="flex flex-col sm:flex-row items-center justify-center w-full min-h-[40vh]">
                    <div className="flex flex-col w-[50vw]">
                    <div className="flex flex-col text-center">
                    <p className="relative text-white z-20 font-sans font-bold text-neutral-700 dark:text-neutral-300 text-base">
                        Upload file
                    </p>
                    <p className="relative text-white z-20 font-sans font-normal text-neutral-800 dark:text-neutral-400 text-base mt-2">
                        Drag or drop your files here or click to upload
                    </p>
                    </div>
                    <div className="relative w-full mt-10 max-w-xl mx-auto">
                        {files.length > 0 &&
                            files.map((file, idx) => (
                                <motion.div
                                    key={"file" + idx}
                                    layoutId={idx === 0 ? "file-upload" : "file-upload-" + idx}
                                    className={cn(
                                        "relative overflow-hidden z-40 bg-white dark:bg-neutral-900 flex flex-col items-start justify-start md:h-24 p-4 mt-4 w-full mx-auto rounded-md",
                                        "shadow-sm"
                                    )}
                                >
                                    <div className="flex justify-between w-full items-center gap-4">
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            layout
                                            className="text-base text-neutral-700 dark:text-neutral-300 truncate max-w-xs"
                                        >
                                            {file.name}
                                        </motion.p>
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            layout
                                            className="rounded-lg px-2 py-1 w-fit flex-shrink-0 text-sm text-neutral-600 dark:bg-neutral-800 dark:text-white shadow-input"
                                        >
                                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                                        </motion.p>
                                    </div>
                                    <div className="flex text-sm md:flex-row flex-col items-start md:items-center w-full mt-2 justify-between text-neutral-600 dark:text-neutral-400">
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            layout
                                            className="px-1 py-0.5 rounded-md bg-gray-100 dark:bg-neutral-800 "
                                        >
                                            {file.type}
                                        </motion.p>
                                        <motion.p
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            layout
                                        >
                                            modified{" "}
                                            {new Date(file.lastModified).toLocaleDateString()}
                                        </motion.p>
                                    </div>

                                    
                                </motion.div>
                            ))}
                        {!files.length && (
                            <motion.div
                                layoutId="file-upload"
                                variants={mainVariant}
                                transition={{
                                    type: "spring",
                                    stiffness: 300,
                                    damping: 20,
                                }}
                                ref={fileRef}
                                className={cn(
                                    "relative group-hover/file:shadow-2xl z-40 bg-white dark:bg-neutral-900 flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md",
                                    "shadow-[0px_10px_50px_rgba(0,0,0,0.1)]"
                                )}
                            >
                                {isDragActive ? (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-neutral-600 flex flex-col items-center"
                                    >
                                        Drop it
                                        <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-400" />
                                    </motion.p>
                                ) : (
                                    <IconUpload className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
                                )}
                            </motion.div>
                        )}
                        {!files.length && (
                            <motion.div
                                variants={secondaryVariant}
                                className="absolute opacity-0 border border-dashed border-sky-400 inset-0 z-30 bg-transparent flex items-center justify-center h-32 mt-4 w-full max-w-[8rem] mx-auto rounded-md"
                            ></motion.div>
                        )}
                    </div>


                    
                    </div>

                    {qrCode && <div className="p-5 bg-black z-[1000]">
                    <img draggable={false} className="rounded-xl mb-5 m-auto select-none text-white" src={qrCode} alt="QR Code" />
                    <span className="flex gap-2">
                        <motion.button
                            className="text-sm bg-black px-3"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                                navigator.clipboard.writeText(fileLink).then(() => {
                                    toast.success('Copied ✔', {
                                        position: "bottom-left",
                                        autoClose: 2000,
                                        hideProgressBar: false,
                                        closeOnClick: true,
                                        pauseOnHover: true,
                                        draggable: true,
                                        progress: 0,
                                        theme: "light",
                                        transition: Flip,
                                    });
                                })
                            }}
                        >
                            <button className="bg-slate-800 no-underline group cursor-pointer relative shadow-2xl shadow-zinc-900 rounded-full p-px text-xs font-semibold leading-6  text-white inline-block">
        <span className="absolute inset-0 overflow-hidden rounded-full">
          <span className="absolute inset-0 rounded-full bg-[image:radial-gradient(75%_100%_at_50%_0%,rgba(56,189,248,0.6)_0%,rgba(56,189,248,0)_75%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"></span>
        </span>
        <div className="relative flex space-x-2 items-center z-10 rounded-full bg-zinc-950 py-0.5 px-4 ring-1 ring-white/10 ">
          <span>{`Copy`}</span>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
              d="M10.75 8.75L14.25 12L10.75 15.25"
            ></path>
          </svg>
          <a href={fileLink} target="_blank" className="font-kanit px-5 p-1 rounded-full">{fileLink}</a>

        </div>
        <span className="absolute -bottom-0 left-[1.125rem] h-px w-[calc(100%-2.25rem)] bg-gradient-to-r from-emerald-400/0 via-emerald-400/90 to-emerald-400/0 transition-opacity duration-500 group-hover:opacity-40"></span>
        
      </button>
                        </motion.button>
                    </span>
                </div>}
                    
                    
                </div>

                
            </motion.div>
        </div>
    );
};

export function GridPattern() {
    const columns = 41;
    const rows = 11;
    return (
        <div className="flex bg-gray-100 dark:bg-neutral-900 flex-shrink-0">
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div className="flex flex-col flex-shrink-0" key={rowIndex}>
                    {Array.from({ length: columns }).map((_, colIndex) => (
                        <div
                            className="w-3 h-3 m-1 bg-white dark:bg-neutral-600 rounded-full"
                            key={colIndex}
                        />
                    ))}
                </div>
            ))}
        </div>
    );
}
