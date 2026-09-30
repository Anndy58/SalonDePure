import { useEffect, useRef } from 'react';
import anime from 'animejs';

/**
 * Hook para animar la entrada de un elemento DOM al montarse sin re-ejecutarse en re-renders.
 */
export const useAnimeIn = (options = {}) => {
  const ref = useRef(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (ref.current && !animatedRef.current) {
      animatedRef.current = true;
      anime({
        targets: ref.current,
        opacity: [0, 1],
        translateY: [15, 0],
        scale: [0.97, 1],
        duration: 450,
        easing: 'easeOutQuad',
        ...options
      });
    }
  }, []);

  return ref;
};

/**
 * Hook para animar modales o popups al montarse una única vez.
 */
export const useAnimeModal = (options = {}) => {
  const ref = useRef(null);
  const animatedRef = useRef(false);

  useEffect(() => {
    if (ref.current && !animatedRef.current) {
      animatedRef.current = true;
      anime({
        targets: ref.current,
        opacity: [0, 1],
        scale: [0.88, 1],
        translateY: [20, 0],
        duration: 400,
        easing: 'easeOutElastic(1, .8)',
        ...options
      });
    }
  }, []);

  return ref;
};

/**
 * Anima la entrada de elementos con verificación de seguridad.
 */
export const animateIn = (target, options = {}) => {
  if (!target || target._animeInDone) return;
  target._animeInDone = true;
  anime({
    targets: target,
    opacity: [0, 1],
    translateY: [15, 0],
    scale: [0.97, 1],
    duration: 450,
    easing: 'easeOutQuad',
    ...options
  });
};

/**
 * Anima modales con verificación de seguridad para evitar re-animaciones.
 */
export const animateModalIn = (target, options = {}) => {
  if (!target || target._animeModalDone) return;
  target._animeModalDone = true;
  anime({
    targets: target,
    opacity: [0, 1],
    scale: [0.88, 1],
    translateY: [20, 0],
    duration: 400,
    easing: 'easeOutElastic(1, .8)',
    ...options
  });
};

/**
 * Anima la entrada escalonada (stagger) para listas y cuadrículas de elementos.
 */
export const animateStagger = (targets, options = {}) => {
  if (!targets || targets.length === 0) return;
  anime({
    targets: targets,
    opacity: [0, 1],
    translateY: [25, 0],
    scale: [0.9, 1],
    delay: anime.stagger(40, { start: 50 }),
    duration: 500,
    easing: 'easeOutCubic',
    ...options
  });
};

/**
 * Anima un botón o elemento interactivo al hacer hover o clic (Efecto Spring/Elastic).
 */
export const animateButtonPress = (target) => {
  if (!target) return;
  anime({
    targets: target,
    scale: [1, 0.92, 1.05, 1],
    duration: 350,
    easing: 'easeOutBack'
  });
};
