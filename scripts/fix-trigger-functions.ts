import { db } from '@repo/database';

async function main() {
  console.log('Fixing trigger functions to use correct schema references...\n');
  
  try {
    // Fix enforce_prescription_for_fulfillment
    console.log('Updating enforce_prescription_for_fulfillment...');
    await db.$executeRaw`
      CREATE OR REPLACE FUNCTION public.enforce_prescription_for_fulfillment()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      DECLARE
          old_status TEXT;
          new_status TEXT;
          prescription_required BOOLEAN;
          prescription_info RECORD;
      BEGIN
          old_status := OLD.status;
          new_status := NEW.status;

          -- Only check when moving to fulfillment statuses
          IF new_status IN ('PROCESSING', 'READY', 'DISPATCHED') AND
             (old_status IS NULL OR old_status NOT IN ('PROCESSING', 'READY', 'DISPATCHED', 'DELIVERED')) THEN

              -- Check if order has prescription items    
              SELECT EXISTS(
                  SELECT 1 FROM public.order_item oi
                  JOIN public.product p ON oi."productId" = p.id 
                  WHERE oi."orderId" = NEW.id
                  AND (p."isPrescriptionRequired" = true OR p."isControlled" = true)
              ) INTO prescription_required;

              IF prescription_required THEN
                  -- Get prescription info
                  SELECT status, "imageUrl", "documentKey"
                  INTO prescription_info
                  FROM public.prescription
                  WHERE "orderId" = NEW.id
                  LIMIT 1;

                  IF prescription_info IS NULL THEN       
                      RAISE EXCEPTION 'Cannot fulfill order % - no prescription record found', NEW.id;        
                  ELSIF prescription_info.status = 'REJECTED' THEN
                      RAISE EXCEPTION 'Cannot fulfill order % - prescription was rejected', NEW.id;
                  ELSIF prescription_info."imageUrl" IS NULL AND prescription_info."documentKey" IS NULL THEN 
                      RAISE EXCEPTION 'Cannot fulfill order % - prescription file not uploaded', NEW.id;      
                  ELSIF prescription_info.status != 'APPROVED' THEN
                      RAISE EXCEPTION 'Cannot fulfill order % - prescription not yet approved (status: %)', NEW.id, prescription_info.status;
                  END IF;
              END IF;
          END IF;

          RETURN NEW;
      END;
      $function$;
    `;
    console.log('✓ Updated enforce_prescription_for_fulfillment');

    // Fix validate_prescription_before_payment
    console.log('\nUpdating validate_prescription_before_payment...');
    await db.$executeRaw`
      CREATE OR REPLACE FUNCTION public.validate_prescription_before_payment()
      RETURNS trigger
      LANGUAGE plpgsql
      AS $function$
      DECLARE
          has_prescription_items BOOLEAN;
          has_prescription_record BOOLEAN;
          has_uploaded_file BOOLEAN;
      BEGIN
          -- Only check when payment status changes to COMPLETED
          IF NEW."paymentStatus" = 'COMPLETED' AND        
             (OLD."paymentStatus" IS NULL OR OLD."paymentStatus" != 'COMPLETED') THEN

              -- Check if order has prescription items    
              SELECT EXISTS(
                  SELECT 1 FROM public.order_item oi
                  JOIN public.product p ON oi."productId" = p.id 
                  WHERE oi."orderId" = NEW.id
                  AND (p."isPrescriptionRequired" = true OR p."isControlled" = true)
              ) INTO has_prescription_items;

              IF has_prescription_items THEN
                  -- Check if prescription record exists  
                  SELECT EXISTS(
                      SELECT 1 FROM public.prescription
                      WHERE "orderId" = NEW.id
                      AND status != 'CANCELLED'
                  ) INTO has_prescription_record;

                  -- Check if file was uploaded
                  SELECT EXISTS(
                      SELECT 1 FROM public.prescription
                      WHERE "orderId" = NEW.id
                      AND ("imageUrl" IS NOT NULL OR "documentKey" IS NOT NULL)
                  ) INTO has_uploaded_file;

                  -- Log the prescription status but don't block payment
                  IF NOT has_prescription_record THEN     
                      RAISE WARNING 'Payment completing for order % without prescription record - system will create one', NEW.id;
                  ELSIF NOT has_uploaded_file THEN        
                      RAISE NOTICE 'Payment completing for order % without prescription file upload - customer will be reminded', NEW.id;
                  ELSE
                      RAISE NOTICE 'Payment completing for order % with prescription uploaded', NEW.id;       
                  END IF;
              END IF;
          END IF;

          -- Always allow the payment to proceed
          RETURN NEW;
      END;
      $function$;
    `;
    console.log('✓ Updated validate_prescription_before_payment');

    console.log('\n✅ All trigger functions updated successfully!');

  } catch (error) {
    console.error('Error updating functions:', error);
  } finally {
    process.exit(0);
  }
}

main();
